#!/bin/bash

# Docker Compose 兼容性脚本
# 自动检测并使用正确的 Docker Compose 命令

# 检测可用的 Docker Compose 命令
detect_compose_command() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        MAJOR_VERSION=$(echo "$COMPOSE_VERSION" | cut -d. -f1)
        
        if [[ $MAJOR_VERSION -ge 2 ]]; then
            echo "docker-compose"
        else
            echo "docker-compose-v1"
        fi
    else
        echo "none"
    fi
}

# 执行 Docker Compose 命令
run_compose() {
    local compose_cmd=$(detect_compose_command)
    local args="$@"
    
    case $compose_cmd in
        "docker compose")
            echo "使用 Docker Compose V2 (内置)"
            docker compose $args
            ;;
        "docker-compose")
            echo "使用 Docker Compose V2 (独立)"
            docker-compose $args
            ;;
        "docker-compose-v1")
            echo "警告: 使用旧版 Docker Compose V1，可能存在兼容性问题"
            echo "建议升级到 Docker Compose V2"
            docker-compose $args
            ;;
        "none")
            echo "错误: 未找到 Docker Compose"
            exit 1
            ;;
    esac
}

# 如果直接运行此脚本，执行传入的参数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_compose "$@"
fi
