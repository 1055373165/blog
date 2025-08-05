package search

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/analysis/analyzer/custom"
	"github.com/blevesearch/bleve/v2/analysis/lang/cjk"
	"github.com/blevesearch/bleve/v2/analysis/tokenizer/unicode"
	"github.com/blevesearch/bleve/v2/search/query"

	"blog-backend/internal/models"
	"blog-backend/pkg/utils"
)

// SearchEngine 搜索引擎接口
type SearchEngine struct {
	index bleve.Index
}

// SearchDocument 搜索文档结构
type SearchDocument struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	Excerpt     string    `json:"excerpt"`
	Slug        string    `json:"slug"`
	AuthorName  string    `json:"author_name"`
	CategoryID  string    `json:"category_id,omitempty"`
	Category    string    `json:"category"`
	Tags        []string  `json:"tags"`
	TagIDs      []string  `json:"tag_ids"`
	SeriesID    string    `json:"series_id,omitempty"`
	Series      string    `json:"series"`
	IsPublished bool      `json:"is_published"`
	PublishedAt time.Time `json:"published_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	ViewsCount  int       `json:"views_count"`
	LikesCount  int       `json:"likes_count"`
}

// SearchResult 搜索结果结构
type SearchResult struct {
	Documents []SearchDocument `json:"documents"`
	Total     uint64           `json:"total"`
	Took      time.Duration    `json:"took"`
	MaxScore  float64          `json:"max_score"`
}

// SearchOptions 搜索选项
type SearchOptions struct {
	Query       string   `json:"query"`
	CategoryIDs []string `json:"category_ids"`
	TagIDs      []string `json:"tag_ids"`
	AuthorIDs   []string `json:"author_ids"`
	SeriesIDs   []string `json:"series_ids"`
	DateFrom    string   `json:"date_from"`
	DateTo      string   `json:"date_to"`
	SortBy      string   `json:"sort_by"`      // score, date, views, likes
	SortOrder   string   `json:"sort_order"`   // asc, desc
	From        int      `json:"from"`
	Size        int      `json:"size"`
	Highlight   bool     `json:"highlight"`
}

var Engine *SearchEngine

// InitSearchEngine 初始化搜索引擎
func InitSearchEngine() error {
	indexPath := getEnv("SEARCH_INDEX_PATH", "./search_index")
	
	// 创建索引目录
	if err := os.MkdirAll(indexPath, 0755); err != nil {
		return fmt.Errorf("创建索引目录失败: %v", err)
	}

	var index bleve.Index
	var err error

	// 尝试打开现有索引
	if _, err := os.Stat(indexPath); err == nil {
		index, err = bleve.Open(indexPath)
		if err != nil {
			log.Printf("打开现有索引失败，将创建新索引: %v", err)
			// 删除损坏的索引
			os.RemoveAll(indexPath)
			index, err = createNewIndex(indexPath)
		}
	} else {
		index, err = createNewIndex(indexPath)
	}

	if err != nil {
		return fmt.Errorf("初始化搜索索引失败: %v", err)
	}

	Engine = &SearchEngine{index: index}
	log.Println("搜索引擎初始化成功")
	return nil
}

// createNewIndex 创建新的搜索索引
func createNewIndex(indexPath string) (bleve.Index, error) {
	// 创建中文分析器
	chineseAnalyzer := map[string]interface{}{
		"type": custom.Name,
		"tokenizer": unicode.Name,
		"token_filters": []string{
			cjk.WidthName,
			"lowercase",
			"stop_zh",
		},
	}

	// 创建索引映射
	indexMapping := bleve.NewIndexMapping()
	
	// 设置默认分析器
	indexMapping.DefaultAnalyzer = "chinese"
	indexMapping.AddCustomAnalyzer("chinese", chineseAnalyzer)

	// 创建文档映射
	documentMapping := bleve.NewDocumentMapping()

	// 标题字段 - 高权重
	titleFieldMapping := bleve.NewTextFieldMapping()
	titleFieldMapping.Analyzer = "chinese"
	titleFieldMapping.Store = true
	titleFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("title", titleFieldMapping)

	// 内容字段
	contentFieldMapping := bleve.NewTextFieldMapping()
	contentFieldMapping.Analyzer = "chinese"
	contentFieldMapping.Store = false // 内容较大，不存储原始内容
	contentFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("content", contentFieldMapping)

	// 摘要字段
	excerptFieldMapping := bleve.NewTextFieldMapping()
	excerptFieldMapping.Analyzer = "chinese"
	excerptFieldMapping.Store = true
	excerptFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("excerpt", excerptFieldMapping)

	// Slug字段
	slugFieldMapping := bleve.NewTextFieldMapping()
	slugFieldMapping.Analyzer = "keyword"
	slugFieldMapping.Store = true
	slugFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("slug", slugFieldMapping)

	// 作者字段
	authorFieldMapping := bleve.NewTextFieldMapping()
	authorFieldMapping.Analyzer = "chinese"
	authorFieldMapping.Store = true
	authorFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("author_name", authorFieldMapping)

	// 分类字段
	categoryFieldMapping := bleve.NewTextFieldMapping()
	categoryFieldMapping.Analyzer = "chinese"
	categoryFieldMapping.Store = true
	categoryFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("category", categoryFieldMapping)

	// 标签字段
	tagsFieldMapping := bleve.NewTextFieldMapping()
	tagsFieldMapping.Analyzer = "chinese"
	tagsFieldMapping.Store = true
	tagsFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("tags", tagsFieldMapping)

	// 系列字段
	seriesFieldMapping := bleve.NewTextFieldMapping()
	seriesFieldMapping.Analyzer = "chinese"
	seriesFieldMapping.Store = true
	seriesFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("series", seriesFieldMapping)

	// 日期字段
	dateFieldMapping := bleve.NewDateTimeFieldMapping()
	dateFieldMapping.Store = true
	dateFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("published_at", dateFieldMapping)
	documentMapping.AddFieldMappingsAt("created_at", dateFieldMapping)
	documentMapping.AddFieldMappingsAt("updated_at", dateFieldMapping)

	// 数值字段
	numericFieldMapping := bleve.NewNumericFieldMapping()
	numericFieldMapping.Store = true
	numericFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("views_count", numericFieldMapping)
	documentMapping.AddFieldMappingsAt("likes_count", numericFieldMapping)

	// 布尔字段
	boolFieldMapping := bleve.NewBooleanFieldMapping()
	boolFieldMapping.Store = true
	boolFieldMapping.Index = true
	documentMapping.AddFieldMappingsAt("is_published", boolFieldMapping)

	// 添加文档映射
	indexMapping.AddDocumentMapping("article", documentMapping)

	// 创建索引
	return bleve.New(indexPath, indexMapping)
}

// IndexArticle 索引单篇文章
func (e *SearchEngine) IndexArticle(article models.Article) error {
	doc := convertArticleToSearchDocument(article)
	return e.index.Index(doc.ID, doc)
}

// DeleteArticle 删除文章索引
func (e *SearchEngine) DeleteArticle(articleID string) error {
	return e.index.Delete(articleID)
}

// UpdateArticle 更新文章索引
func (e *SearchEngine) UpdateArticle(article models.Article) error {
	// Bleve的Index方法既可以创建也可以更新
	return e.IndexArticle(article)
}

// Search 执行搜索
func (e *SearchEngine) Search(options SearchOptions) (*SearchResult, error) {
	// 构建查询
	query := e.buildQuery(options)

	// 创建搜索请求
	searchRequest := bleve.NewSearchRequest(query)
	searchRequest.From = options.From
	searchRequest.Size = options.Size

	// 设置排序
	if options.SortBy != "" {
		searchRequest.SortBy(e.buildSortFields(options.SortBy, options.SortOrder))
	}

	// 设置高亮
	if options.Highlight {
		searchRequest.Highlight = bleve.NewHighlight()
		searchRequest.Highlight.AddField("title")
		searchRequest.Highlight.AddField("content")
		searchRequest.Highlight.AddField("excerpt")
	}

	// 执行搜索
	searchResult, err := e.index.Search(searchRequest)
	if err != nil {
		return nil, fmt.Errorf("搜索执行失败: %v", err)
	}

	// 转换结果
	result := &SearchResult{
		Total:    searchResult.Total,
		Took:     searchResult.Took,
		MaxScore: searchResult.MaxScore,
		Documents: make([]SearchDocument, 0, len(searchResult.Hits)),
	}

	for _, hit := range searchResult.Hits {
		doc := SearchDocument{
			ID: hit.ID,
		}

		// 从存储的字段中恢复文档数据
		if hit.Fields != nil {
			if title, ok := hit.Fields["title"].(string); ok {
				doc.Title = title
			}
			if excerpt, ok := hit.Fields["excerpt"].(string); ok {
				doc.Excerpt = excerpt
			}
			if slug, ok := hit.Fields["slug"].(string); ok {
				doc.Slug = slug
			}
			if authorName, ok := hit.Fields["author_name"].(string); ok {
				doc.AuthorName = authorName
			}
			if category, ok := hit.Fields["category"].(string); ok {
				doc.Category = category
			}
			if series, ok := hit.Fields["series"].(string); ok {
				doc.Series = series
			}
			if tags, ok := hit.Fields["tags"].([]interface{}); ok {
				doc.Tags = make([]string, len(tags))
				for i, tag := range tags {
					if tagStr, ok := tag.(string); ok {
						doc.Tags[i] = tagStr
					}
				}
			}
		}

		result.Documents = append(result.Documents, doc)
	}

	return result, nil
}

// buildQuery 构建搜索查询
func (e *SearchEngine) buildQuery(options SearchOptions) query.Query {
	var queries []query.Query

	// 主搜索查询
	if options.Query != "" {
		// 构建多字段查询
		titleQuery := bleve.NewMatchQuery(options.Query)
		titleQuery.SetField("title")
		titleQuery.SetBoost(3.0) // 标题权重最高

		contentQuery := bleve.NewMatchQuery(options.Query)
		contentQuery.SetField("content")
		contentQuery.SetBoost(1.0)

		excerptQuery := bleve.NewMatchQuery(options.Query)
		excerptQuery.SetField("excerpt")
		excerptQuery.SetBoost(2.0)

		authorQuery := bleve.NewMatchQuery(options.Query)
		authorQuery.SetField("author_name")
		authorQuery.SetBoost(1.5)

		categoryQuery := bleve.NewMatchQuery(options.Query)
		categoryQuery.SetField("category")
		categoryQuery.SetBoost(1.5)

		tagsQuery := bleve.NewMatchQuery(options.Query)
		tagsQuery.SetField("tags")
		tagsQuery.SetBoost(2.0)

		seriesQuery := bleve.NewMatchQuery(options.Query)
		seriesQuery.SetField("series")
		seriesQuery.SetBoost(1.5)

		// 使用DisjunctionQuery组合多个字段
		disjunctionQuery := bleve.NewDisjunctionQuery(
			titleQuery, contentQuery, excerptQuery,
			authorQuery, categoryQuery, tagsQuery, seriesQuery,
		)
		queries = append(queries, disjunctionQuery)
	}

	// 分类筛选
	if len(options.CategoryIDs) > 0 {
		categoryQueries := make([]query.Query, len(options.CategoryIDs))
		for i, categoryID := range options.CategoryIDs {
			termQuery := bleve.NewTermQuery(categoryID)
			termQuery.SetField("category_id")
			categoryQueries[i] = termQuery
		}
		queries = append(queries, bleve.NewDisjunctionQuery(categoryQueries...))
	}

	// 标签筛选
	if len(options.TagIDs) > 0 {
		tagQueries := make([]query.Query, len(options.TagIDs))
		for i, tagID := range options.TagIDs {
			termQuery := bleve.NewTermQuery(tagID)
			termQuery.SetField("tag_ids")
			tagQueries[i] = termQuery
		}
		queries = append(queries, bleve.NewDisjunctionQuery(tagQueries...))
	}

	// 系列筛选
	if len(options.SeriesIDs) > 0 {
		seriesQueries := make([]query.Query, len(options.SeriesIDs))
		for i, seriesID := range options.SeriesIDs {
			termQuery := bleve.NewTermQuery(seriesID)
			termQuery.SetField("series_id")
			seriesQueries[i] = termQuery
		}
		queries = append(queries, bleve.NewDisjunctionQuery(seriesQueries...))
	}

	// 日期范围筛选
	if options.DateFrom != "" || options.DateTo != "" {
		var startTime, endTime time.Time
		var hasStart, hasEnd bool
		if options.DateFrom != "" {
			if dateFrom, err := time.Parse("2006-01-02", options.DateFrom); err == nil {
				startTime = dateFrom
				hasStart = true
			}
		}
		if options.DateTo != "" {
			if dateTo, err := time.Parse("2006-01-02", options.DateTo); err == nil {
				endTime = dateTo
				hasEnd = true
			}
		}
		if hasStart || hasEnd {
			var dateQuery *query.DateRangeQuery
			if hasStart && hasEnd {
				dateQuery = bleve.NewDateRangeQuery(startTime, endTime)
			} else if hasStart {
				dateQuery = bleve.NewDateRangeQuery(startTime, time.Time{})
			} else {
				dateQuery = bleve.NewDateRangeQuery(time.Time{}, endTime)
			}
			dateQuery.SetField("published_at")
			queries = append(queries, dateQuery)
		}
	}

	// 只搜索已发布的文章
	publishedQuery := bleve.NewBoolFieldQuery(true)
	publishedQuery.SetField("is_published")
	queries = append(queries, publishedQuery)

	// 如果没有任何查询条件，返回匹配所有已发布文章的查询
	if len(queries) == 1 && queries[0] == publishedQuery {
		return publishedQuery
	}

	// 使用ConjunctionQuery组合所有查询条件（AND关系）
	if len(queries) == 1 {
		return queries[0]
	}
	return bleve.NewConjunctionQuery(queries...)
}

// buildSortFields 构建排序字段
func (e *SearchEngine) buildSortFields(sortBy, sortOrder string) []string {
	desc := sortOrder == "desc"
	
	switch sortBy {
	case "date":
		if desc {
			return []string{"-published_at"}
		}
		return []string{"published_at"}
	case "views":
		if desc {
			return []string{"-views_count"}
		}
		return []string{"views_count"}
	case "likes":
		if desc {
			return []string{"-likes_count"}
		}
		return []string{"likes_count"}
	case "created":
		if desc {
			return []string{"-created_at"}
		}
		return []string{"created_at"}
	default: // score
		if desc {
			return []string{"-_score"}
		}
		return []string{"_score"}
	}
}

// convertArticleToSearchDocument 将文章模型转换为搜索文档
func convertArticleToSearchDocument(article models.Article) SearchDocument {
	doc := SearchDocument{
		ID:          strconv.FormatUint(uint64(article.ID), 10),
		Title:       article.Title,
		Content:     utils.StripHTML(article.Content),
		Excerpt:     article.Excerpt,
		Slug:        article.Slug,
		AuthorName:  article.Author.Name,
		IsPublished: article.IsPublished,
		CreatedAt:   article.CreatedAt,
		UpdatedAt:   article.UpdatedAt,
		ViewsCount:  article.ViewsCount,
		LikesCount:  article.LikesCount,
	}

	if article.PublishedAt != nil {
		doc.PublishedAt = *article.PublishedAt
	}

	if article.Category != nil {
		doc.Category = article.Category.Name
		doc.CategoryID = strconv.FormatUint(uint64(article.Category.ID), 10)
	}

	if article.Series != nil {
		doc.Series = article.Series.Name
		doc.SeriesID = strconv.FormatUint(uint64(article.Series.ID), 10)
	}

	// 处理标签
	if len(article.Tags) > 0 {
		doc.Tags = make([]string, len(article.Tags))
		doc.TagIDs = make([]string, len(article.Tags))
		for i, tag := range article.Tags {
			doc.Tags[i] = tag.Name
			doc.TagIDs[i] = strconv.FormatUint(uint64(tag.ID), 10)
		}
	}

	return doc
}

// BatchIndexArticles 批量索引文章
func (e *SearchEngine) BatchIndexArticles(articles []models.Article) error {
	batch := e.index.NewBatch()
	
	for _, article := range articles {
		if !article.IsPublished {
			continue // 只索引已发布的文章
		}
		
		doc := convertArticleToSearchDocument(article)
		batch.Index(doc.ID, doc)
	}
	
	return e.index.Batch(batch)
}

// CloseSearchEngine 关闭搜索引擎
func CloseSearchEngine() error {
	if Engine != nil {
		return Engine.index.Close()
	}
	return nil
}

// getEnv 获取环境变量
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}