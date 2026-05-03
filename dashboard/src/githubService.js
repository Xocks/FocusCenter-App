// src/githubService.js

// 动态获取本地存储的配置
export const getGithubConfig = () => {
  return {
    token: localStorage.getItem('github_token') || '',
    owner: localStorage.getItem('github_owner') || '',
    repo: localStorage.getItem('github_repo') || ''
  }
}

const getApiUrl = (fileName) => {
  const { owner, repo } = getGithubConfig()
  return `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`
}

const getHeaders = () => {
  const { token } = getGithubConfig()
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
}

const utf8ToBase64 = (str) => window.btoa(unescape(encodeURIComponent(str)))
const base64ToUtf8 = (str) => decodeURIComponent(escape(window.atob(str)))

export async function fetchFile(fileName) {
  const { token, owner, repo } = getGithubConfig()
  if (!token || !owner || !repo) return { error: 'no-config' } // 拦截：如果没有配置，直接返回

  try {
    const response = await fetch(getApiUrl(fileName), { headers: getHeaders() })
    if (response.status === 404) return { content: null, sha: null } 
    if (!response.ok) throw new Error(`${fileName} 拉取失败`)

    const data = await response.json()
    return {
      content: JSON.parse(base64ToUtf8(data.content)),
      sha: data.sha
    }
  } catch (error) {
    console.error(error)
    return null 
  }
}

export async function saveFile(fileName, data, sha) {
  try {
    const contentBase64 = utf8ToBase64(JSON.stringify(data, null, 2))
    const bodyData = {
      message: `Auto-sync: Update ${fileName}`,
      content: contentBase64,
      ...(sha && { sha: sha })
    }

    const response = await fetch(getApiUrl(fileName), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(bodyData)
    })

    if (!response.ok) throw new Error(`${fileName} 保存失败`)
    const result = await response.json()
    return result.content.sha
  } catch (error) {
    console.error(error)
    return null
  }
}