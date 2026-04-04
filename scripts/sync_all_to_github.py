#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import json
import pymysql
import yaml
import requests
from dotenv import load_dotenv

def resolve_parent_slugs(item_id, items_dict):
    """递归获取某记录的所有父层级 slug，返回从顶层到当前的完整列表"""
    slugs = []
    current_id = item_id
    seen = set()
    while current_id:
        if current_id in seen:
            print(f"Warning: Cycle detected for ID {current_id}")
            break
        seen.add(current_id)
        if current_id not in items_dict:
            break
        row = items_dict[current_id]
        slugs.append(row['slug'])
        current_id = row['parent_id']
    return slugs[::-1] # 反转，使得父层级在前

def main():
    # 1. 记载产线环境变量
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.prod'))

    # DB 配置
    db_host = os.getenv('DB_HOST', '127.0.0.1')
    db_port = int(os.getenv('DB_PORT', 3306))
    db_user = os.getenv('DB_USER', 'root')
    db_pass = os.getenv('DB_PASSWORD', '')
    db_name = os.getenv('DB_NAME', 'blog_db')

    # GitHub 配置
    gh_token = os.getenv('AI_ASSET_GITHUB_TOKEN')
    gh_owner = os.getenv('AI_ASSET_GITHUB_REPO_OWNER')
    gh_repo = os.getenv('AI_ASSET_GITHUB_REPO_NAME')
    gh_branch = os.getenv('AI_ASSET_GITHUB_REPO_BRANCH', 'main')
    gh_api = os.getenv('AI_ASSET_GITHUB_API_URL', 'https://api.github.com').rstrip('/')

    if not all([gh_token, gh_owner, gh_repo]):
        print("错误：缺少必要的 GitHub 环境变量 (Token/Owner/Repo)")
        return

    print("连接数据库...")
    conn = pymysql.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_pass,
        database=db_name,
        cursorclass=pymysql.cursors.DictCursor
    )

    desired_files = {}

    try:
        with conn.cursor() as cursor:
            # ========================
            # 处理 Prompts
            # ========================
            cursor.execute("SELECT * FROM prompts WHERE deleted_at IS NULL")
            prompts = cursor.fetchall()
            prompts_dict = {p['id']: p for p in prompts}
            
            print(f"找到 {len(prompts)} 个 Prompts，正在构建 Markdown 文件...")
            for p in prompts:
                slugs = resolve_parent_slugs(p['parent_id'], prompts_dict)
                slugs.append(f"{p['slug']}.md")
                filepath = "prompts/" + "/".join(slugs)

                fm = {
                    "name": p['name'],
                    "slug": p['slug'],
                    "status": p['status']
                }
                if p['description']: fm['description'] = p['description']
                if p['notes']: fm['notes'] = p['notes']
                if p['tags']: fm['tags'] = json.loads(p['tags'])
                if p['applicable_models']: fm['applicable_models'] = json.loads(p['applicable_models'])

                fm_str = yaml.dump(fm, allow_unicode=True, sort_keys=False).strip()
                content = f"---\n{fm_str}\n---\n\n{p['content'] or ''}".strip()
                desired_files[filepath] = content

            # ========================
            # 处理 Skills
            # ========================
            cursor.execute("SELECT * FROM skills WHERE deleted_at IS NULL")
            skills = cursor.fetchall()
            skills_dict = {s['id']: s for s in skills}

            print(f"找到 {len(skills)} 个 Skills，正在构建目录和配置...")
            for s in skills:
                slugs = resolve_parent_slugs(s['parent_id'], skills_dict)
                slugs.append(s['slug'])
                base_dir = "skills/" + "/".join(slugs)

                fm = {"name": s['slug']}
                if s['description']: fm['description'] = s['description']
                
                # 合并 Anthropic 设置
                if s['anthropic_config']:
                    config = json.loads(s['anthropic_config'])
                    for k, v in config.items():
                        if k.lower() not in ('name', 'description', 'slug'):
                            fm[k] = v

                fm_str = yaml.dump(fm, allow_unicode=True, sort_keys=False).strip()
                content = f"---\n{fm_str}\n---\n\n{s['content'] or ''}".strip()
                desired_files[base_dir + "/SKILL.md"] = content

                # 附属文件
                if s.get('supporting_files'):
                    files = json.loads(s['supporting_files'])
                    for f in files:
                        p = f['path'].strip().lstrip('./').lstrip('/')
                        if p:
                            desired_files[f"{base_dir}/{p}"] = f['content']

    finally:
        conn.close()

    if not desired_files:
        print("未找到任何资产需同步。")
        return

    # ========================
    # 调用 GitHub API 执行同步
    # ========================
    print(f"准备推送 {len(desired_files)} 个文件到 GitHub: {gh_owner}/{gh_repo} @ {gh_branch}")
    
    headers = {
        "Authorization": f"Bearer {gh_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    # 1. 获取最新 Branch 引用
    res = requests.get(f"{gh_api}/repos/{gh_owner}/{gh_repo}/branches/{gh_branch}", headers=headers)
    res.raise_for_status()
    branch_data = res.json()
    latest_commit_sha = branch_data['commit']['sha']
    base_tree_sha = branch_data['commit']['commit']['tree']['sha']

    # 2. 为每个文件创建 blob 并组装完整的 tree
    tree_nodes = []
    for filepath, content in desired_files.items():
        print(f"  > 正在创建 Blob: {filepath}")
        res = requests.post(
            f"{gh_api}/repos/{gh_owner}/{gh_repo}/git/blobs",
            headers=headers,
            json={"content": content, "encoding": "utf-8"}
        )
        res.raise_for_status()
        tree_nodes.append({
            "path": filepath,
            "mode": "100644",
            "type": "blob",
            "sha": res.json()['sha']
        })

    # 3. 创建 Tree
    print("创建新的 Git Tree...")
    res = requests.post(
        f"{gh_api}/repos/{gh_owner}/{gh_repo}/git/trees",
        headers=headers,
        json={"base_tree": base_tree_sha, "tree": tree_nodes}
    )
    res.raise_for_status()
    new_tree_sha = res.json()['sha']

    # 4. 创建 Commit
    print("创建 Commit...")
    res = requests.post(
        f"{gh_api}/repos/{gh_owner}/{gh_repo}/git/commits",
        headers=headers,
        json={
            "message": "sync: 一键导入全量 AI 资产",
            "tree": new_tree_sha,
            "parents": [latest_commit_sha]
        }
    )
    res.raise_for_status()
    new_commit_sha = res.json()['sha']

    # 5. 更新 Branch
    print("更新远端分支 Ref...")
    res = requests.patch(
        f"{gh_api}/repos/{gh_owner}/{gh_repo}/git/refs/heads/{gh_branch}",
        headers=headers,
        json={"sha": new_commit_sha}
    )
    res.raise_for_status()
    print("同步成功完成！")

if __name__ == '__main__':
    main()
