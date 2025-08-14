#!/bin/bash

# Blog 系统监控脚本
# 用于监控应用健康状态、系统资源使用情况

set -e

# 配置变量
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"  # 检查间隔（秒）
HEALTH_URL="${HEALTH_URL:-http://localhost:3001/api/health}"
WEB_URL="${WEB_URL:-http://localhost}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
LOG_FILE="${LOG_FILE:-/opt/blog/logs/monitor.log}"
PROJECT_DIR="/opt/blog/source"

# 阈值配置
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=90
LOAD_THRESHOLD=5.0

# 告警状态文件
ALERT_STATE_FILE="/tmp/blog_alert_state"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# 检查应用健康状态
check_application_health() {
    local status="OK"
    local details=""
    
    # 检查后端API健康
    if curl -f -s --connect-timeout 10 "$HEALTH_URL" >/dev/null 2>&1; then
        info "✓ 后端API服务正常"
    else
        error "✗ 后端API服务异常"
        status="ERROR"
        details="后端API无响应"
    fi
    
    # 检查前端Web服务
    if curl -f -s --connect-timeout 10 "$WEB_URL" >/dev/null 2>&1; then
        info "✓ 前端Web服务正常"
    else
        error "✗ 前端Web服务异常"
        status="ERROR"
        details="${details} 前端Web无响应"
    fi
    
    echo "$status|$details"
}

# 检查Docker容器状态
check_docker_containers() {
    local status="OK"
    local details=""
    
    cd "$PROJECT_DIR" || return 1
    
    # 检查所有容器是否运行
    local containers=($(docker compose -f docker-compose.prod.yml ps --services))
    
    for container in "${containers[@]}"; do
        local container_status=$(docker compose -f docker-compose.prod.yml ps "$container" --format "{{.State}}")
        
        if [[ "$container_status" == "running" ]]; then
            info "✓ 容器 $container 运行正常"
        else
            error "✗ 容器 $container 状态异常: $container_status"
            status="ERROR"
            details="${details} 容器${container}异常"
        fi
    done
    
    echo "$status|$details"
}

# 检查系统资源
check_system_resources() {
    local status="OK"
    local details=""
    
    # 检查CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        warn "CPU使用率过高: ${cpu_usage}%"
        status="WARNING"
        details="${details} CPU使用率${cpu_usage}%"
    else
        info "✓ CPU使用率正常: ${cpu_usage}%"
    fi
    
    # 检查内存使用率
    local memory_info=$(free | grep Mem)
    local total_mem=$(echo $memory_info | awk '{print $2}')
    local used_mem=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$(( used_mem * 100 / total_mem ))
    
    if (( memory_usage > MEMORY_THRESHOLD )); then
        warn "内存使用率过高: ${memory_usage}%"
        if [[ "$status" != "ERROR" ]]; then
            status="WARNING"
        fi
        details="${details} 内存使用率${memory_usage}%"
    else
        info "✓ 内存使用率正常: ${memory_usage}%"
    fi
    
    # 检查磁盘使用率
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if (( disk_usage > DISK_THRESHOLD )); then
        warn "磁盘使用率过高: ${disk_usage}%"
        if [[ "$status" != "ERROR" ]]; then
            status="WARNING"
        fi
        details="${details} 磁盘使用率${disk_usage}%"
    else
        info "✓ 磁盘使用率正常: ${disk_usage}%"
    fi
    
    # 检查系统负载
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    if (( $(echo "$load_avg > $LOAD_THRESHOLD" | bc -l) )); then
        warn "系统负载过高: $load_avg"
        if [[ "$status" != "ERROR" ]]; then
            status="WARNING"
        fi
        details="${details} 系统负载${load_avg}"
    else
        info "✓ 系统负载正常: $load_avg"
    fi
    
    echo "$status|$details"
}

# 检查数据库连接
check_database() {
    local status="OK"
    local details=""
    
    # 检查MySQL连接
    if docker exec blog_mysql_prod mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1;" >/dev/null 2>&1; then
        info "✓ MySQL数据库连接正常"
    else
        error "✗ MySQL数据库连接异常"
        status="ERROR"
        details="MySQL连接失败"
    fi
    
    # 检查Redis连接
    if docker exec blog_redis_prod redis-cli -a "${REDIS_PASSWORD}" ping | grep -q "PONG"; then
        info "✓ Redis缓存连接正常"
    else
        error "✗ Redis缓存连接异常"
        status="ERROR"
        details="${details} Redis连接失败"
    fi
    
    echo "$status|$details"
}

# 检查日志错误
check_logs() {
    local status="OK"
    local details=""
    local error_count=0
    
    # 检查应用日志中的错误
    if [[ -f "/opt/blog/logs/app/error.log" ]]; then
        local recent_errors=$(tail -100 /opt/blog/logs/app/error.log | grep -i "error\|fatal\|panic" | wc -l)
        if (( recent_errors > 5 )); then
            warn "应用日志中发现较多错误: $recent_errors 条"
            status="WARNING"
            details="${details} 应用错误${recent_errors}条"
        fi
    fi
    
    # 检查Nginx错误日志
    if [[ -f "/opt/blog/logs/nginx/error.log" ]]; then
        local nginx_errors=$(tail -100 /opt/blog/logs/nginx/error.log | grep -v "client disconnected" | wc -l)
        if (( nginx_errors > 10 )); then
            warn "Nginx日志中发现较多错误: $nginx_errors 条"
            if [[ "$status" != "ERROR" ]]; then
                status="WARNING"
            fi
            details="${details} Nginx错误${nginx_errors}条"
        fi
    fi
    
    echo "$status|$details"
}

# 性能检查
check_performance() {
    local status="OK"
    local details=""
    
    # 检查API响应时间
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$HEALTH_URL" 2>/dev/null || echo "999")
    local response_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    
    if (( response_ms > 5000 )); then
        warn "API响应时间过长: ${response_ms}ms"
        status="WARNING"
        details="${details} API响应${response_ms}ms"
    else
        info "✓ API响应时间正常: ${response_ms}ms"
    fi
    
    # 检查数据库连接数
    local db_connections=$(docker exec blog_mysql_prod mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | tail -1 | awk '{print $2}' || echo "0")
    
    if (( db_connections > 100 )); then
        warn "数据库连接数过多: $db_connections"
        if [[ "$status" != "ERROR" ]]; then
            status="WARNING"
        fi
        details="${details} 数据库连接${db_connections}"
    else
        info "✓ 数据库连接数正常: $db_connections"
    fi
    
    echo "$status|$details"
}

# 发送告警
send_alert() {
    local alert_type="$1"
    local message="$2"
    local current_time=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 检查是否需要发送告警（避免重复告警）
    local alert_key="${alert_type}_$(date +%Y%m%d%H)"
    
    if [[ -f "$ALERT_STATE_FILE" ]] && grep -q "$alert_key" "$ALERT_STATE_FILE"; then
        return 0  # 已经发送过告警
    fi
    
    # 记录告警状态
    echo "$alert_key" >> "$ALERT_STATE_FILE"
    
    # 发送邮件告警（如果配置了邮件）
    if command -v mail >/dev/null 2>&1 && [[ -n "$ALERT_EMAIL" ]]; then
        {
            echo "Blog系统监控告警"
            echo "=================="
            echo ""
            echo "告警类型: $alert_type"
            echo "告警时间: $current_time"
            echo "告警内容: $message"
            echo ""
            echo "请及时检查系统状态。"
        } | mail -s "Blog系统告警 - $alert_type" "$ALERT_EMAIL"
    fi
    
    # 记录到日志
    error "发送告警: $alert_type - $message"
}

# 生成监控报告
generate_monitor_report() {
    local app_result="$1"
    local docker_result="$2"
    local system_result="$3"
    local db_result="$4"
    local log_result="$5"
    local perf_result="$6"
    
    local report_file="/opt/blog/logs/monitor_report_$(date +%Y%m%d).json"
    
    cat > "$report_file" <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "overall_status": "OK",
    "checks": {
        "application": {
            "status": "$(echo $app_result | cut -d'|' -f1)",
            "details": "$(echo $app_result | cut -d'|' -f2)"
        },
        "docker": {
            "status": "$(echo $docker_result | cut -d'|' -f1)",
            "details": "$(echo $docker_result | cut -d'|' -f2)"
        },
        "system": {
            "status": "$(echo $system_result | cut -d'|' -f1)",
            "details": "$(echo $system_result | cut -d'|' -f2)"
        },
        "database": {
            "status": "$(echo $db_result | cut -d'|' -f1)",
            "details": "$(echo $db_result | cut -d'|' -f2)"
        },
        "logs": {
            "status": "$(echo $log_result | cut -d'|' -f1)",
            "details": "$(echo $log_result | cut -d'|' -f2)"
        },
        "performance": {
            "status": "$(echo $perf_result | cut -d'|' -f1)",
            "details": "$(echo $perf_result | cut -d'|' -f2)"
        }
    }
}
EOF
}

# 清理旧的告警状态
cleanup_alert_state() {
    if [[ -f "$ALERT_STATE_FILE" ]]; then
        # 清理1天前的告警记录
        find "$(dirname "$ALERT_STATE_FILE")" -name "$(basename "$ALERT_STATE_FILE")" -mtime +1 -delete 2>/dev/null || true
    fi
}

# 主监控循环
main_monitor_loop() {
    log "启动监控服务..."
    
    while true; do
        log "执行健康检查..."
        
        # 执行各项检查
        local app_result=$(check_application_health)
        local docker_result=$(check_docker_containers)
        local system_result=$(check_system_resources)
        local db_result=$(check_database)
        local log_result=$(check_logs)
        local perf_result=$(check_performance)
        
        # 生成监控报告
        generate_monitor_report "$app_result" "$docker_result" "$system_result" "$db_result" "$log_result" "$perf_result"
        
        # 检查是否需要发送告警
        local has_error=false
        local has_warning=false
        
        for result in "$app_result" "$docker_result" "$system_result" "$db_result" "$log_result" "$perf_result"; do
            local status=$(echo "$result" | cut -d'|' -f1)
            local details=$(echo "$result" | cut -d'|' -f2)
            
            if [[ "$status" == "ERROR" ]]; then
                send_alert "ERROR" "$details"
                has_error=true
            elif [[ "$status" == "WARNING" && "$has_error" == "false" ]]; then
                has_warning=true
            fi
        done
        
        if [[ "$has_warning" == "true" && "$has_error" == "false" ]]; then
            send_alert "WARNING" "系统出现警告状态"
        fi
        
        # 清理旧的告警状态
        cleanup_alert_state
        
        log "健康检查完成，等待 $CHECK_INTERVAL 秒..."
        sleep "$CHECK_INTERVAL"
    done
}

# 一次性检查模式
single_check() {
    log "执行一次性健康检查..."
    
    local app_result=$(check_application_health)
    local docker_result=$(check_docker_containers)
    local system_result=$(check_system_resources)
    local db_result=$(check_database)
    local log_result=$(check_logs)
    local perf_result=$(check_performance)
    
    generate_monitor_report "$app_result" "$docker_result" "$system_result" "$db_result" "$log_result" "$perf_result"
    
    echo ""
    echo "=== 监控检查结果 ==="
    echo "应用服务: $(echo $app_result | cut -d'|' -f1)"
    echo "Docker容器: $(echo $docker_result | cut -d'|' -f1)"
    echo "系统资源: $(echo $system_result | cut -d'|' -f1)"
    echo "数据库: $(echo $db_result | cut -d'|' -f1)"
    echo "日志检查: $(echo $log_result | cut -d'|' -f1)"
    echo "性能检查: $(echo $perf_result | cut -d'|' -f1)"
    echo "===================="
}

# 根据参数决定运行模式
if [[ "$1" == "--once" ]]; then
    single_check
else
    main_monitor_loop
fi