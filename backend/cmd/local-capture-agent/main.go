package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"
)

type finalizeCaptureRequest struct {
	Stage        string `json:"stage"`
	Progress     int    `json:"progress"`
	AutoSync     bool   `json:"auto_sync"`
	ErrorMessage string `json:"error_message,omitempty"`
}

type reportCaptureEventRequest struct {
	EventKind string                 `json:"event_kind"`
	Summary   string                 `json:"summary,omitempty"`
	Payload   map[string]interface{} `json:"payload,omitempty"`
	Origin    string                 `json:"origin,omitempty"`
}

type fileSnapshot struct {
	Path    string
	Size    int64
	ModTime time.Time
}

type fileObservation struct {
	Snapshot   fileSnapshot
	FirstSeen  time.Time
	LastChange time.Time
}

func main() {
	server := flag.String("server", "http://localhost:3001", "博客后端地址")
	agentToken := flag.String("agent-token", os.Getenv("NOTEBOOKLM_AGENT_TOKEN"), "NotebookLM agent token")
	jobID := flag.Int("job-id", 0, "导入任务 ID")
	filePath := flag.String("file", "", "要上传的文件路径")
	textFile := flag.String("text-file", "", "要上传的文本文件路径")
	watchDirsRaw := flag.String("watch-dirs", "", "逗号分隔的监听目录列表，例如 ~/Downloads,/path/to/wechat")
	autoDetectDirs := flag.Bool("auto-detect-dirs", true, "未显式传入 --watch-dirs 时，自动探测候选目录")
	listCandidates := flag.Bool("list-candidates", false, "打印自动探测到的候选目录后退出")
	previewExisting := flag.Int("preview-existing", 6, "启动监听前打印最近已有文件的数量")
	watchRecursive := flag.Bool("watch-recursive", true, "是否递归扫描监听目录")
	watchTimeout := flag.Duration("watch-timeout", 10*time.Minute, "监听目录超时时间")
	pollInterval := flag.Duration("poll-interval", 2*time.Second, "轮询扫描间隔")
	settleDuration := flag.Duration("settle-duration", 8*time.Second, "文件大小保持稳定多久后视为写入完成")
	extensionsRaw := flag.String("extensions", ".mp4,.mov,.m4v,.webm,.txt,.md,.srt,.vtt", "允许捕获的文件扩展名列表")
	minSizeBytes := flag.Int64("min-size-bytes", 0, "最小文件大小，默认按 artifact 类型自动推断")
	artifactKind := flag.String("artifact-kind", "source_file", "artifact 类型: source_file/transcript/text/metadata")
	mimeType := flag.String("mime-type", "", "可选 MIME 类型覆盖")
	stage := flag.String("stage", "桌面代理已上传采集结果", "采集阶段说明")
	primary := flag.Bool("primary", true, "是否标记为 primary artifact")
	autoSync := flag.Bool("auto-sync", true, "上传后是否自动触发同步")
	flag.Parse()

	if strings.TrimSpace(*agentToken) == "" {
		exitWithError("缺少 agent token，请通过 --agent-token 或 NOTEBOOKLM_AGENT_TOKEN 提供")
	}
	if *jobID <= 0 {
		exitWithError("请通过 --job-id 指定导入任务 ID")
	}

	watchDirs, err := parseWatchDirs(*watchDirsRaw)
	if err != nil {
		exitWithError(err.Error())
	}
	dirsWereAutoDetected := false
	if len(watchDirs) == 0 && *autoDetectDirs {
		watchDirs = detectCandidateWatchDirs()
		dirsWereAutoDetected = true
	}
	if *listCandidates {
		if len(watchDirs) == 0 {
			fmt.Println("未探测到可用候选目录")
			return
		}
		fmt.Println("候选目录:")
		for _, dir := range watchDirs {
			fmt.Printf("  - %s\n", dir)
		}
		return
	}

	switch {
	case strings.TrimSpace(*filePath) != "":
		runSingleUpload(agentRunConfig{
			Server:       *server,
			AgentToken:   *agentToken,
			JobID:        *jobID,
			FilePath:     *filePath,
			ArtifactKind: *artifactKind,
			MimeType:     *mimeType,
			Stage:        *stage,
			IsPrimary:    *primary,
			AutoSync:     *autoSync,
		})
	case strings.TrimSpace(*textFile) != "":
		runSingleUpload(agentRunConfig{
			Server:       *server,
			AgentToken:   *agentToken,
			JobID:        *jobID,
			FilePath:     *textFile,
			ArtifactKind: *artifactKind,
			MimeType:     defaultString(*mimeType, "text/plain; charset=utf-8"),
			Stage:        *stage,
			IsPrimary:    *primary,
			AutoSync:     *autoSync,
		})
	case len(watchDirs) > 0:
		runWatchMode(watchRunConfig{
			Server:          *server,
			AgentToken:      *agentToken,
			JobID:           *jobID,
			WatchDirs:       watchDirs,
			AutoDetected:    dirsWereAutoDetected,
			WatchRecursive:  *watchRecursive,
			WatchTimeout:    *watchTimeout,
			PollInterval:    *pollInterval,
			SettleDuration:  *settleDuration,
			PreviewExisting: *previewExisting,
			Extensions:      parseExtensions(*extensionsRaw),
			MinSizeBytes:    resolveMinSizeBytes(*minSizeBytes, *artifactKind),
			ArtifactKind:    *artifactKind,
			MimeType:        *mimeType,
			Stage:           *stage,
			IsPrimary:       *primary,
			AutoSync:        *autoSync,
		})
	default:
		exitWithError("请提供 --file、--text-file，或 --watch-dirs")
	}
}

type agentRunConfig struct {
	Server       string
	AgentToken   string
	JobID        int
	FilePath     string
	ArtifactKind string
	MimeType     string
	Stage        string
	IsPrimary    bool
	AutoSync     bool
}

func runSingleUpload(cfg agentRunConfig) {
	client := &http.Client{Timeout: 90 * time.Second}
	jobPrefix := jobPrefix(cfg.Server, cfg.JobID)

	if err := postMultipart(client, jobPrefix+"/capture-start", cfg.AgentToken, map[string]string{
		"stage":    "桌面代理开始提交采集结果",
		"progress": "20",
	}, nil); err != nil {
		exitWithError(fmt.Sprintf("启动采集状态失败: %v", err))
	}

	fields := map[string]string{
		"artifact_kind": strings.TrimSpace(cfg.ArtifactKind),
		"is_primary":    fmt.Sprintf("%t", cfg.IsPrimary),
		"filename":      filepath.Base(cfg.FilePath),
	}
	if strings.TrimSpace(cfg.MimeType) != "" {
		fields["mime_type"] = strings.TrimSpace(cfg.MimeType)
	} else if guessed := mime.TypeByExtension(strings.ToLower(filepath.Ext(cfg.FilePath))); guessed != "" {
		fields["mime_type"] = guessed
	}

	uploadErr := postMultipart(client, jobPrefix+"/artifacts", cfg.AgentToken, fields, &multipartFileInput{
		FieldName: "file",
		Path:      cfg.FilePath,
	})
	if uploadErr != nil {
		_ = reportCaptureEvent(client, jobPrefix+"/events", cfg.AgentToken, reportCaptureEventRequest{
			EventKind: "error",
			Summary:   "直接上传文件失败",
			Payload: map[string]interface{}{
				"path":  cfg.FilePath,
				"error": uploadErr.Error(),
			},
			Origin: "desktop_agent",
		})
		_ = postJSON(client, jobPrefix+"/finalize", cfg.AgentToken, finalizeCaptureRequest{
			Stage:        "桌面代理上传失败",
			Progress:     35,
			ErrorMessage: uploadErr.Error(),
			AutoSync:     false,
		})
		exitWithError(fmt.Sprintf("上传 artifact 失败: %v", uploadErr))
	}

	_ = reportCaptureEvent(client, jobPrefix+"/events", cfg.AgentToken, reportCaptureEventRequest{
		EventKind: "upload_completed",
		Summary:   fmt.Sprintf("已上传 %s", filepath.Base(cfg.FilePath)),
		Payload: map[string]interface{}{
			"path": cfg.FilePath,
		},
		Origin: "desktop_agent",
	})

	if err := postJSON(client, jobPrefix+"/finalize", cfg.AgentToken, finalizeCaptureRequest{
		Stage:    cfg.Stage,
		Progress: 55,
		AutoSync: cfg.AutoSync,
	}); err != nil {
		exitWithError(fmt.Sprintf("结束采集阶段失败: %v", err))
	}

	fmt.Printf("artifact 已提交到 job #%d: %s\n", cfg.JobID, cfg.FilePath)
}

type watchRunConfig struct {
	Server          string
	AgentToken      string
	JobID           int
	WatchDirs       []string
	AutoDetected    bool
	WatchRecursive  bool
	WatchTimeout    time.Duration
	PollInterval    time.Duration
	SettleDuration  time.Duration
	PreviewExisting int
	Extensions      map[string]bool
	MinSizeBytes    int64
	ArtifactKind    string
	MimeType        string
	Stage           string
	IsPrimary       bool
	AutoSync        bool
}

func runWatchMode(cfg watchRunConfig) {
	client := &http.Client{Timeout: 90 * time.Second}
	jobPrefix := jobPrefix(cfg.Server, cfg.JobID)

	baseline, err := scanWatchDirs(cfg.WatchDirs, cfg.WatchRecursive, cfg.Extensions)
	if err != nil {
		exitWithError(fmt.Sprintf("建立目录基线失败: %v", err))
	}

	fmt.Printf("开始监听 job #%d\n", cfg.JobID)
	for _, dir := range cfg.WatchDirs {
		fmt.Printf("  - %s\n", dir)
	}
	previewItems := recentPreviewItems(baseline, cfg.PreviewExisting)
	printRecentPreview(previewItems)

	_ = reportCaptureEvent(client, jobPrefix+"/events", cfg.AgentToken, reportCaptureEventRequest{
		EventKind: "directory_hints",
		Summary:   fmt.Sprintf("桌面代理正在监听 %d 个候选目录", len(cfg.WatchDirs)),
		Payload: map[string]interface{}{
			"watch_dirs":      cfg.WatchDirs,
			"preview_files":   previewPayload(previewItems),
			"watch_recursive": cfg.WatchRecursive,
			"auto_detected":   cfg.AutoDetected,
		},
		Origin: "desktop_agent",
	})

	if err := postMultipart(client, jobPrefix+"/capture-start", cfg.AgentToken, map[string]string{
		"stage":    fmt.Sprintf("桌面代理正在监听 %d 个目录", len(cfg.WatchDirs)),
		"progress": "18",
	}, nil); err != nil {
		exitWithError(fmt.Sprintf("启动采集状态失败: %v", err))
	}

	observed := make(map[string]fileObservation)
	deadline := time.Now().Add(cfg.WatchTimeout)
	for {
		if time.Now().After(deadline) {
			_ = reportCaptureEvent(client, jobPrefix+"/events", cfg.AgentToken, reportCaptureEventRequest{
				EventKind: "error",
				Summary:   "监听目录超时",
				Payload: map[string]interface{}{
					"watch_dirs": cfg.WatchDirs,
				},
				Origin: "desktop_agent",
			})
			_ = postJSON(client, jobPrefix+"/finalize", cfg.AgentToken, finalizeCaptureRequest{
				Stage:        "监听目录超时，未发现新的稳定文件",
				Progress:     32,
				ErrorMessage: "watch timeout: no new stable file was detected",
				AutoSync:     false,
			})
			exitWithError("监听超时，未发现新的稳定文件")
		}

		snapshots, err := scanWatchDirs(cfg.WatchDirs, cfg.WatchRecursive, cfg.Extensions)
		if err != nil {
			time.Sleep(cfg.PollInterval)
			continue
		}

		if candidate, ok := findStableCandidate(baseline, observed, snapshots, cfg.MinSizeBytes, cfg.SettleDuration); ok {
			fmt.Printf("捕获到稳定文件: %s (%d bytes)\n", candidate.Path, candidate.Size)
			_ = reportCaptureEvent(client, jobPrefix+"/events", cfg.AgentToken, reportCaptureEventRequest{
				EventKind: "candidate_found",
				Summary:   fmt.Sprintf("命中新文件 %s", filepath.Base(candidate.Path)),
				Payload: map[string]interface{}{
					"path":      candidate.Path,
					"size":      candidate.Size,
					"modified":  candidate.ModTime.Format(time.RFC3339),
					"extension": strings.ToLower(filepath.Ext(candidate.Path)),
				},
				Origin: "desktop_agent",
			})

			fields := map[string]string{
				"artifact_kind": strings.TrimSpace(cfg.ArtifactKind),
				"is_primary":    fmt.Sprintf("%t", cfg.IsPrimary),
				"filename":      filepath.Base(candidate.Path),
			}
			if strings.TrimSpace(cfg.MimeType) != "" {
				fields["mime_type"] = strings.TrimSpace(cfg.MimeType)
			} else if guessed := mime.TypeByExtension(strings.ToLower(filepath.Ext(candidate.Path))); guessed != "" {
				fields["mime_type"] = guessed
			}

			if err := postMultipart(client, jobPrefix+"/artifacts", cfg.AgentToken, fields, &multipartFileInput{
				FieldName: "file",
				Path:      candidate.Path,
			}); err != nil {
				_ = reportCaptureEvent(client, jobPrefix+"/events", cfg.AgentToken, reportCaptureEventRequest{
					EventKind: "error",
					Summary:   "上传捕获文件失败",
					Payload: map[string]interface{}{
						"path":  candidate.Path,
						"error": err.Error(),
					},
					Origin: "desktop_agent",
				})
				_ = postJSON(client, jobPrefix+"/finalize", cfg.AgentToken, finalizeCaptureRequest{
					Stage:        "桌面代理上传捕获文件失败",
					Progress:     38,
					ErrorMessage: err.Error(),
					AutoSync:     false,
				})
				exitWithError(fmt.Sprintf("上传捕获文件失败: %v", err))
			}

			_ = reportCaptureEvent(client, jobPrefix+"/events", cfg.AgentToken, reportCaptureEventRequest{
				EventKind: "upload_completed",
				Summary:   fmt.Sprintf("已上传 %s", filepath.Base(candidate.Path)),
				Payload: map[string]interface{}{
					"path": candidate.Path,
					"size": candidate.Size,
				},
				Origin: "desktop_agent",
			})

			finalStage := cfg.Stage
			if strings.TrimSpace(finalStage) == "" {
				finalStage = fmt.Sprintf("已从监听目录捕获 %s", filepath.Base(candidate.Path))
			} else {
				finalStage = fmt.Sprintf("%s (%s)", strings.TrimSpace(finalStage), filepath.Base(candidate.Path))
			}

			if err := postJSON(client, jobPrefix+"/finalize", cfg.AgentToken, finalizeCaptureRequest{
				Stage:    finalStage,
				Progress: 58,
				AutoSync: cfg.AutoSync,
			}); err != nil {
				exitWithError(fmt.Sprintf("结束采集阶段失败: %v", err))
			}

			fmt.Printf("watch 模式已完成，artifact 已提交到 job #%d\n", cfg.JobID)
			return
		}

		time.Sleep(cfg.PollInterval)
	}
}

func findStableCandidate(
	baseline map[string]fileSnapshot,
	observed map[string]fileObservation,
	snapshots map[string]fileSnapshot,
	minSizeBytes int64,
	settleDuration time.Duration,
) (fileSnapshot, bool) {
	now := time.Now()
	currentPaths := make(map[string]bool, len(snapshots))
	stableCandidates := make([]fileSnapshot, 0)

	for _, snapshot := range snapshots {
		currentPaths[snapshot.Path] = true

		if baselineSnapshot, exists := baseline[snapshot.Path]; exists &&
			baselineSnapshot.Size == snapshot.Size &&
			baselineSnapshot.ModTime.Equal(snapshot.ModTime) {
			continue
		}

		observation, exists := observed[snapshot.Path]
		if !exists {
			observed[snapshot.Path] = fileObservation{
				Snapshot:   snapshot,
				FirstSeen:  now,
				LastChange: now,
			}
			continue
		}

		if observation.Snapshot.Size != snapshot.Size || !observation.Snapshot.ModTime.Equal(snapshot.ModTime) {
			observation.Snapshot = snapshot
			observation.LastChange = now
			observed[snapshot.Path] = observation
			continue
		}

		if snapshot.Size >= minSizeBytes && now.Sub(observation.LastChange) >= settleDuration {
			stableCandidates = append(stableCandidates, snapshot)
		}
	}

	for path := range observed {
		if !currentPaths[path] {
			delete(observed, path)
		}
	}

	if len(stableCandidates) == 0 {
		return fileSnapshot{}, false
	}

	sort.Slice(stableCandidates, func(i, j int) bool {
		if stableCandidates[i].ModTime.Equal(stableCandidates[j].ModTime) {
			return stableCandidates[i].Size > stableCandidates[j].Size
		}
		return stableCandidates[i].ModTime.After(stableCandidates[j].ModTime)
	})

	return stableCandidates[0], true
}

func scanWatchDirs(dirs []string, recursive bool, extensions map[string]bool) (map[string]fileSnapshot, error) {
	result := make(map[string]fileSnapshot)

	for _, dir := range dirs {
		if recursive {
			err := filepath.WalkDir(dir, func(path string, entry fs.DirEntry, walkErr error) error {
				if walkErr != nil {
					return nil
				}
				if entry.IsDir() {
					return nil
				}
				info, err := entry.Info()
				if err != nil || !info.Mode().IsRegular() {
					return nil
				}
				if !isEligibleWatchFile(path, extensions) {
					return nil
				}
				result[path] = fileSnapshot{
					Path:    path,
					Size:    info.Size(),
					ModTime: info.ModTime(),
				}
				return nil
			})
			if err != nil {
				return nil, err
			}
			continue
		}

		entries, err := os.ReadDir(dir)
		if err != nil {
			return nil, err
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			path := filepath.Join(dir, entry.Name())
			info, err := entry.Info()
			if err != nil || !info.Mode().IsRegular() {
				continue
			}
			if !isEligibleWatchFile(path, extensions) {
				continue
			}
			result[path] = fileSnapshot{
				Path:    path,
				Size:    info.Size(),
				ModTime: info.ModTime(),
			}
		}
	}

	return result, nil
}

func isEligibleWatchFile(path string, extensions map[string]bool) bool {
	name := strings.ToLower(filepath.Base(path))
	if strings.HasPrefix(name, ".") {
		return false
	}
	for _, suffix := range []string{".tmp", ".download", ".crdownload", ".part", ".partial"} {
		if strings.HasSuffix(name, suffix) {
			return false
		}
	}

	ext := strings.ToLower(filepath.Ext(name))
	if len(extensions) == 0 {
		return true
	}
	return extensions[ext]
}

func parseWatchDirs(raw string) ([]string, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}

	parts := strings.Split(raw, ",")
	dirs := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		expanded, err := expandPath(value)
		if err != nil {
			return nil, err
		}
		info, err := os.Stat(expanded)
		if err != nil {
			return nil, fmt.Errorf("监听目录不存在: %s", expanded)
		}
		if !info.IsDir() {
			return nil, fmt.Errorf("监听路径不是目录: %s", expanded)
		}
		dirs = append(dirs, expanded)
	}
	return dirs, nil
}

func parseExtensions(raw string) map[string]bool {
	extensions := make(map[string]bool)
	for _, part := range strings.Split(raw, ",") {
		value := strings.ToLower(strings.TrimSpace(part))
		if value == "" {
			continue
		}
		if !strings.HasPrefix(value, ".") {
			value = "." + value
		}
		extensions[value] = true
	}
	return extensions
}

func resolveMinSizeBytes(value int64, artifactKind string) int64 {
	if value > 0 {
		return value
	}

	switch strings.TrimSpace(artifactKind) {
	case "transcript", "text", "metadata":
		return 128
	default:
		return 1 * 1024 * 1024
	}
}

func detectCandidateWatchDirs() []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	paths := make([]string, 0)
	switch runtime.GOOS {
	case "darwin":
		paths = append(paths,
			filepath.Join(home, "Downloads"),
			filepath.Join(home, "Documents", "WeChat Files"),
			filepath.Join(home, "Library", "Containers", "com.tencent.xinWeChat", "Data", "Documents"),
			filepath.Join(home, "Library", "Containers", "com.tencent.xinWeChat", "Data", "Library", "Application Support", "Wechat"),
			filepath.Join(home, "Library", "Containers", "com.tencent.xinWeChat", "Data", "Library", "Application Support", "WeChat"),
		)
	case "windows":
		userProfile := os.Getenv("USERPROFILE")
		if userProfile == "" {
			userProfile = home
		}
		paths = append(paths,
			filepath.Join(userProfile, "Downloads"),
			filepath.Join(userProfile, "Documents", "WeChat Files"),
		)
	default:
		paths = append(paths,
			filepath.Join(home, "Downloads"),
			filepath.Join(home, "Documents", "WeChat Files"),
		)
	}

	result := make([]string, 0, len(paths))
	seen := make(map[string]bool)
	for _, path := range paths {
		if path == "" || seen[path] {
			continue
		}
		info, err := os.Stat(path)
		if err != nil || !info.IsDir() {
			continue
		}
		seen[path] = true
		result = append(result, path)
	}
	return result
}

func recentPreviewItems(snapshots map[string]fileSnapshot, limit int) []fileSnapshot {
	if limit <= 0 || len(snapshots) == 0 {
		return nil
	}

	items := make([]fileSnapshot, 0, len(snapshots))
	for _, snapshot := range snapshots {
		items = append(items, snapshot)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].ModTime.Equal(items[j].ModTime) {
			return items[i].Size > items[j].Size
		}
		return items[i].ModTime.After(items[j].ModTime)
	})

	if len(items) > limit {
		items = items[:limit]
	}

	return items
}

func printRecentPreview(items []fileSnapshot) {
	if len(items) == 0 {
		return
	}

	fmt.Println("最近已有文件预览:")
	for _, item := range items {
		fmt.Printf("  - %s | %s | %d bytes\n", item.ModTime.Format(time.RFC3339), item.Path, item.Size)
	}
}

func previewPayload(items []fileSnapshot) []map[string]interface{} {
	if len(items) == 0 {
		return nil
	}

	payload := make([]map[string]interface{}, 0, len(items))
	for _, item := range items {
		payload = append(payload, map[string]interface{}{
			"path":      item.Path,
			"size":      item.Size,
			"modified":  item.ModTime.Format(time.RFC3339),
			"extension": strings.ToLower(filepath.Ext(item.Path)),
		})
	}
	return payload
}

func expandPath(path string) (string, error) {
	if strings.TrimSpace(path) == "" {
		return "", fmt.Errorf("路径不能为空")
	}

	if path == "~" || strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		if path == "~" {
			return home, nil
		}
		return filepath.Join(home, strings.TrimPrefix(path, "~/")), nil
	}

	return path, nil
}

func jobPrefix(server string, jobID int) string {
	baseURL := strings.TrimRight(strings.TrimSpace(server), "/")
	return fmt.Sprintf("%s/api/notebooklm/agent/import-jobs/%d", baseURL, jobID)
}

type multipartFileInput struct {
	FieldName string
	Path      string
}

func postMultipart(client *http.Client, endpoint, token string, fields map[string]string, fileInput *multipartFileInput) error {
	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)

	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			return err
		}
	}

	if fileInput != nil {
		file, err := os.Open(fileInput.Path)
		if err != nil {
			return err
		}
		defer file.Close()

		part, err := writer.CreateFormFile(fileInput.FieldName, filepath.Base(fileInput.Path))
		if err != nil {
			return err
		}
		if _, err := io.Copy(part, file); err != nil {
			return err
		}
	}

	if err := writer.Close(); err != nil {
		return err
	}

	request, err := http.NewRequest(http.MethodPost, endpoint, &buffer)
	if err != nil {
		return err
	}

	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return doRequest(client, request)
}

func postJSON(client *http.Client, endpoint, token string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	request, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}

	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Content-Type", "application/json")
	return doRequest(client, request)
}

func doRequest(client *http.Client, request *http.Request) error {
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf("%s: %s", response.Status, strings.TrimSpace(string(body)))
	}

	return nil
}

func reportCaptureEvent(client *http.Client, endpoint, token string, payload reportCaptureEventRequest) error {
	return postJSON(client, endpoint, token, payload)
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}

func exitWithError(message string) {
	fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
