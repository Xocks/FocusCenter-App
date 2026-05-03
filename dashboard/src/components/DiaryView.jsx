import React, { useState, useEffect, useCallback } from 'react'
import { Book, Folder, FileText, ChevronRight, ChevronDown, RefreshCw, AlertCircle, ArrowLeft, GitBranch, Settings } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function DiaryView() {
  // 🚀 从本地存储中动态读取设置 (取代硬编码)
  const githubToken = localStorage.getItem('github_token') || ''
  const obsOwner = localStorage.getItem('obsidian_owner') || ''
  const obsRepo = localStorage.getItem('obsidian_repo') || ''
  
  // 动态解析黑名单字符串成数组
  const blacklistStr = localStorage.getItem('obsidian_blacklist') || '.obsidian, .git, README.md'
  const BLACKLIST = blacklistStr.split(',').map(s => s.trim()).filter(Boolean)

  const [fileTree, setFileTree] = useState([])
  const [isLoadingTree, setIsLoadingTree] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [expandedFolders, setExpandedFolders] = useState({})

  // 过滤函数
  const isAllowed = (path) => {
    return !BLACKLIST.some(blocked => path.startsWith(blocked) || path.includes(`/${blocked}`))
  }

  // 获取文件树
  const fetchFileTree = useCallback(async () => {
    if (!githubToken || !obsOwner || !obsRepo) return
    
    setIsLoadingTree(true)
    setErrorMsg('')
    try {
      const branchRes = await fetch(`https://api.github.com/repos/${obsOwner}/${obsRepo}/branches/main`, {
        headers: { Authorization: `token ${githubToken}` }
      })
      
      let branchSha = ''
      if (branchRes.ok) {
        branchSha = (await branchRes.json()).commit.sha
      } else {
        const masterRes = await fetch(`https://api.github.com/repos/${obsOwner}/${obsRepo}/branches/master`, {
          headers: { Authorization: `token ${githubToken}` }
        })
        if (!masterRes.ok) throw new Error("找不到 main 或 master 分支")
        branchSha = (await masterRes.json()).commit.sha
      }

      const treeRes = await fetch(`https://api.github.com/repos/${obsOwner}/${obsRepo}/git/trees/${branchSha}?recursive=1`, {
        headers: { Authorization: `token ${githubToken}` }
      })

      if (!treeRes.ok) throw new Error('拉取失败，请检查仓库名与权限。')

      const treeData = await treeRes.json()
      
      const validItems = treeData.tree.filter(item => {
        if (!isAllowed(item.path)) return false
        if (item.type === 'blob' && !item.path.endsWith('.md')) return false 
        return true
      })

      const buildTree = (paths) => {
        const result = []
        const level = { result }
        paths.forEach(item => {
          item.path.split('/').reduce((r, name, i, a) => {
            if (!r[name]) {
              r[name] = { result: [] }
              const isFolder = i !== a.length - 1 || item.type === 'tree'
              r.result.push({ name, path: item.path, type: isFolder ? 'folder' : 'file', children: r[name].result })
            }
            return r[name]
          }, level)
        })
        return result
      }

      setFileTree(buildTree(validItems))
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsLoadingTree(false)
    }
  }, [githubToken, obsOwner, obsRepo])

  useEffect(() => { fetchFileTree() }, [fetchFileTree])

  // 获取文件内容
  const handleSelectFile = async (file) => {
    if (file.type === 'folder') {
      setExpandedFolders(prev => ({ ...prev, [file.path]: !prev[file.path] }))
      return
    }

    setSelectedFile(file)
    setIsLoadingContent(true)
    setErrorMsg('')
    
    try {
      const res = await fetch(`https://api.github.com/repos/${obsOwner}/${obsRepo}/contents/${file.path}`, {
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3.raw' }
      })
      if (!res.ok) throw new Error('无法获取文章内容。')
      setFileContent(await res.text())
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsLoadingContent(false)
    }
  }

  const renderTree = (nodes, depth = 0) => {
    return nodes.map(node => (
      <div key={node.path} style={{ paddingLeft: `${depth * 12}px` }} className="my-0.5">
        <button onClick={() => handleSelectFile(node)} className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors text-sm font-medium ${selectedFile?.path === node.path ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
          {node.type === 'folder' ? (expandedFolders[node.path] ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />) : <div className="w-3.5" />}
          {node.type === 'folder' ? <Folder size={14} className={selectedFile?.path === node.path ? 'text-blue-200' : 'text-blue-500'} /> : <FileText size={14} className={selectedFile?.path === node.path ? 'text-blue-200' : 'text-slate-400'} />}
          <span className="truncate flex-1">{node.name.replace('.md', '')}</span>
        </button>
        {node.type === 'folder' && expandedFolders[node.path] && node.children.length > 0 && <div className="mt-0.5 ml-2 border-l border-slate-200">{renderTree(node.children, 1)}</div>}
      </div>
    ))
  }

  return (
    <div className="p-4 md:p-6 pb-24 h-full flex flex-col">
      {(!githubToken || !obsOwner || !obsRepo) && (
        <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center shadow-sm space-y-4 mt-10">
          <Settings size={48} className="mx-auto text-slate-200" />
          <p className="text-sm font-bold text-slate-700">尚未配置知识库源</p>
          <p className="text-xs text-slate-400">请前往系统设置的“Obsidian 知识库配置”填写您的 GitHub 仓库信息。</p>
        </div>
      )}

      {githubToken && obsOwner && obsRepo && (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-180px)]">
          <div className={`w-full md:w-64 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col shrink-0 ${selectedFile && 'hidden md:flex'}`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-2"><GitBranch size={16} className="text-slate-400" /><span className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{obsRepo}</span></div>
              <button onClick={fetchFileTree} className="text-slate-400 hover:text-blue-500"><RefreshCw size={14} className={isLoadingTree ? 'animate-spin' : ''} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {isLoadingTree ? <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2"><RefreshCw size={20} className="animate-spin" /><span className="text-xs font-bold">拉取目录...</span></div> : renderTree(fileTree)}
            </div>
          </div>

          <div className={`flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${!selectedFile && 'hidden md:flex'}`}>
            {selectedFile ? (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50 shrink-0">
                  <button onClick={() => setSelectedFile(null)} className="md:hidden p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg"><ArrowLeft size={18} /></button>
                  <FileText size={18} className="text-blue-500 hidden md:block" />
                  <span className="font-bold text-slate-800 flex-1 truncate">{selectedFile.name.replace('.md', '')}</span>
                  <a href={`https://github.com/${obsOwner}/${obsRepo}/blob/main/${selectedFile.path}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-400 hover:text-blue-500 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1">在 GitHub 查看</a>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
                  {isLoadingContent ? <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500 gap-3"><RefreshCw size={24} className="animate-spin" /><span className="text-sm font-bold">解析文档中...</span></div> : errorMsg ? <div className="text-red-500 flex items-center gap-2 font-bold"><AlertCircle /> {errorMsg}</div> : (
                    <article className="prose prose-slate prose-blue max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{fileContent}</ReactMarkdown></article>
                  )}
                </div>
              </>
            ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><Book size={48} className="text-slate-200 mb-4" /><span className="font-bold text-slate-500">选择左侧笔记以进行阅读</span></div>}
          </div>
        </div>
      )}
    </div>
  )
}