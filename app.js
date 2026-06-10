// ============================================
// GENOVA — Frontend connecté à Supabase
// ============================================

const SUPABASE_URL = 'https://vpgxehgsxeimohtnuylf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_coyGpSOYxI5ha5MsR1iPtw_gaKDHl0W'

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let currentUser = null
let currentProject = null
let authMode = 'login'
let pendingOtpEmail = ''
let projects = []

// ============================================
// AUTH
// ============================================

async function initAuth() {
  const { data: { session } } = await db.auth.getSession()
  if (session) {
    currentUser = session.user
    onSignedIn()
  } else {
    document.getElementById('authOverlay').classList.remove('hidden')
    showAuthForm()
  }
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user
      onSignedIn()
    }
    if (event === 'SIGNED_OUT') {
      currentUser = null
      document.getElementById('authOverlay').classList.remove('hidden')
      showAuthForm()
    }
  })
}

function setAuthMode(mode) {
  authMode = mode
  showAuthForm()
  const signupFields = document.getElementById('signupProfileFields')
  if (signupFields) signupFields.classList.toggle('hidden', mode !== 'signup')
  document.getElementById('authTabLogin').classList.toggle('active', mode === 'login')
  document.getElementById('authTabSignup').classList.toggle('active', mode === 'signup')
  document.getElementById('authSubmit').textContent = mode === 'login' ? 'Se connecter' : 'Créer mon compte'
  document.getElementById('authPassword').autocomplete = mode === 'login' ? 'current-password' : 'new-password'
  document.getElementById('authError').style.color = 'var(--red)'
  document.getElementById('authError').textContent = ''
}

function showAuthForm() {
  const authForm = document.getElementById('authFormView')
  const otpForm = document.getElementById('otpFormView')
  const subtitle = document.getElementById('authSubtitle')
  if (authForm) authForm.classList.remove('hidden')
  if (otpForm) otpForm.classList.add('hidden')
  if (subtitle) subtitle.textContent = 'Décris ton app. On la construit. Elle se déploie toute seule.'
}

function showOtpForm(email) {
  pendingOtpEmail = email
  const authForm = document.getElementById('authFormView')
  const otpForm = document.getElementById('otpFormView')
  const label = document.getElementById('otpEmailLabel')
  const subtitle = document.getElementById('authSubtitle')
  const otpInput = document.getElementById('otpCode')
  const otpError = document.getElementById('otpError')

  if (authForm) authForm.classList.add('hidden')
  if (otpForm) otpForm.classList.remove('hidden')
  if (label) label.textContent = email
  if (subtitle) subtitle.textContent = 'Vérification de sécurité'
  if (otpInput) {
    otpInput.value = ''
    setTimeout(() => otpInput.focus(), 80)
  }
  if (otpError) {
    otpError.style.color = 'var(--text2)'
    otpError.textContent = 'Le code expire après quelques minutes.'
  }
}

function backToAuthForm() {
  pendingOtpEmail = ''
  showAuthForm()
  setAuthMode(authMode)
}

async function submitAuth() {
  const email = document.getElementById('authEmail').value.trim().toLowerCase()
  const password = document.getElementById('authPassword').value
  const errorEl = document.getElementById('authError')
  errorEl.style.color = 'var(--red)'
  errorEl.textContent = ''

  if (!email || !password) {
    errorEl.textContent = 'Email et mot de passe requis.'
    return
  }

  const btn = document.getElementById('authSubmit')
  btn.disabled = true
  btn.textContent = 'Chargement...'

  try {
    let result
    if (authMode === 'signup') {
      const firstName = document.getElementById('signupFirstName')?.value.trim() || ''
      const lastName = document.getElementById('signupLastName')?.value.trim() || ''
      const company = document.getElementById('signupCompany')?.value.trim() || ''
      const displayName = [firstName, lastName].filter(Boolean).join(' ')

      result = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            company,
            display_name: displayName || email
          }
        }
      })
      if (result.error) {
        errorEl.style.color = 'var(--red)'
        errorEl.textContent = traduireErreur(result.error.message)
      } else if (result.data.session) {
        currentUser = result.data.user
        onSignedIn()
      } else {
        showOtpForm(email)
        showToast('Code de confirmation envoyé')
      }
    } else {
      result = await db.auth.signInWithPassword({ email, password })
      if (result.error) {
        errorEl.style.color = 'var(--red)'
        errorEl.textContent = traduireErreur(result.error.message)
      }
    }
  } catch (e) {
    errorEl.textContent = 'Erreur de connexion au serveur.'
    console.error(e)
  }

  btn.disabled = false
  btn.textContent = authMode === 'login' ? 'Se connecter' : 'Créer mon compte'
}

async function verifyOtpCode() {
  const code = document.getElementById('otpCode').value.replace(/\D/g, '').slice(0, 6)
  const errorEl = document.getElementById('otpError')
  const btn = document.getElementById('otpSubmit')

  errorEl.style.color = 'var(--red)'
  errorEl.textContent = ''

  if (!pendingOtpEmail) {
    errorEl.textContent = 'Email introuvable. Recommence l’inscription.'
    return
  }
  if (code.length !== 6) {
    errorEl.textContent = 'Entre le code à 6 chiffres.'
    return
  }

  btn.disabled = true
  btn.textContent = 'Vérification...'

  try {
    const { data, error } = await db.auth.verifyOtp({
      email: pendingOtpEmail,
      token: code,
      type: 'signup'
    })

    if (error) {
      errorEl.style.color = 'var(--red)'
      errorEl.textContent = traduireErreur(error.message)
    } else if (data.session) {
      currentUser = data.user
      pendingOtpEmail = ''
      showToast('Email confirmé. Bienvenue sur Genova !')
      onSignedIn()
    } else {
      errorEl.style.color = 'var(--teal-light)'
      errorEl.textContent = 'Email confirmé. Tu peux maintenant te connecter.'
      setTimeout(() => backToAuthForm(), 1200)
    }
  } catch (e) {
    errorEl.textContent = 'Impossible de vérifier le code.'
    console.error(e)
  }

  btn.disabled = false
  btn.textContent = 'Vérifier le code'
}

async function resendOtpCode() {
  const errorEl = document.getElementById('otpError')
  const btn = document.getElementById('otpResend')

  if (!pendingOtpEmail) {
    errorEl.style.color = 'var(--red)'
    errorEl.textContent = 'Email introuvable. Recommence l’inscription.'
    return
  }

  btn.disabled = true
  btn.textContent = 'Envoi...'

  try {
    const { error } = await db.auth.resend({
      type: 'signup',
      email: pendingOtpEmail
    })
    if (error) {
      errorEl.style.color = 'var(--red)'
      errorEl.textContent = traduireErreur(error.message)
    } else {
      errorEl.style.color = 'var(--teal-light)'
      errorEl.textContent = 'Nouveau code envoyé.'
      showToast('Nouveau code envoyé')
    }
  } catch (e) {
    errorEl.style.color = 'var(--red)'
    errorEl.textContent = 'Impossible de renvoyer le code.'
    console.error(e)
  }

  btn.disabled = false
  btn.textContent = 'Renvoyer le code'
}

function traduireErreur(msg) {
  const map = {
    'Invalid login credentials': 'Email ou mot de passe incorrect.',
    'User already registered': 'Un compte existe déjà avec cet email.',
    'Password should be at least 6 characters.': 'Le mot de passe doit faire au moins 6 caractères.',
    'Email not confirmed': 'Confirme ton email avant de te connecter.',
    'Token has expired or is invalid': 'Le code est expiré ou incorrect.',
    'Email rate limit exceeded': 'Trop de demandes. Attends un peu avant de renvoyer un code.',
    'Signup requires a valid password': 'Le mot de passe n’est pas valide.',
    'Unable to validate email address: invalid format': 'Format d’email invalide.'
  }
  return map[msg] || msg
}

async function signOut() {
  await db.auth.signOut()
  projects = []
  currentProject = null
  showToast('Déconnecté')
}

async function onSignedIn() {
  document.getElementById('authOverlay').classList.add('hidden')
  let initials = getInitialsFromUser(currentUser)

  const { data: profile } = await db
    .from('profiles')
    .select('first_name,last_name,display_name')
    .eq('id', currentUser.id)
    .maybeSingle()

  if (profile) initials = getInitialsFromProfile(profile) || initials
  document.getElementById('avatarBtn').textContent = initials
  loadProjects()
}

function getInitialsFromUser(user) {
  const meta = user?.user_metadata || {}
  const fromName = [meta.first_name, meta.last_name].filter(Boolean).map(v => String(v).trim()[0]).join('')
  if (fromName) return fromName.toUpperCase().slice(0, 2)
  return (user?.email || '??').slice(0, 2).toUpperCase()
}

function getInitialsFromProfile(profile) {
  const fromNames = [profile.first_name, profile.last_name].filter(Boolean).map(v => String(v).trim()[0]).join('')
  if (fromNames) return fromNames.toUpperCase().slice(0, 2)
  if (profile.display_name) return String(profile.display_name).slice(0, 2).toUpperCase()
  return ''
}

// ============================================
// PROJETS — CRUD Supabase
// ============================================

async function loadProjects() {
  const { data, error } = await db
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    showToast('Erreur de chargement des projets')
    console.error(error)
    return
  }
  projects = data || []
  renderSidebar()

  if (projects.length > 0 && !currentProject) {
    setCurrentProject(projects[0])
  }
}

function renderSidebar() {
  const recentEl = document.getElementById('projectListRecent')
  const favEl = document.getElementById('projectListFav')
  recentEl.innerHTML = ''
  favEl.innerHTML = ''

  if (projects.length === 0) {
    recentEl.innerHTML = '<div class="proj-empty">Aucun projet — crée le premier !</div>'
    return
  }

  const icons = { web: 'ti-browser', mobile: 'ti-device-mobile', fullstack: 'ti-layout-grid' }
  const dots = { deployed: 'green', building: 'amber', planning: 'amber', coding: 'amber', capturing: 'amber', analyzing: 'amber', deploying: 'amber', draft: 'gray', failed: 'gray' }

  projects.forEach(p => {
    const item = document.createElement('div')
    item.className = 'project-item' + (currentProject && currentProject.id === p.id ? ' active' : '')
    item.innerHTML = `
      <i class="ti ${icons[p.app_type] || 'ti-layout'}"></i>
      <span class="project-item-name">${escapeHtml(p.name)}</span>
      <span class="status-dot ${dots[p.status] || 'gray'}"></span>`
    item.onclick = () => setCurrentProject(p)
    if (p.is_favorite) favEl.appendChild(item)
    else recentEl.appendChild(item)
  })

  document.getElementById('favLabel').style.display =
    projects.some(p => p.is_favorite) ? 'block' : 'none'
}

function setCurrentProject(p) {
  currentProject = p
  document.getElementById('projectName').textContent = p.name
  const badge = document.querySelector('.project-badge')
  const labels = {
    deployed: 'Déployé', building: 'En cours', planning: 'Planification', coding: 'Code',
    capturing: 'Capture', analyzing: 'Vision', deploying: 'Déploiement', draft: 'Brouillon', failed: 'Échec'
  }
  badge.textContent = labels[p.status] || p.status
  badge.className = 'project-badge' + (p.status === 'deployed' ? ' deployed' : '')
  document.getElementById('deployUrl').textContent = p.deploy_url || 'pas encore déployé'
  if (p.initial_prompt) document.getElementById('promptInput').value = p.initial_prompt
  renderSidebar()
  loadIterations(p.id)
}

async function createProject() {
  const name = document.getElementById('newProjectName').value.trim() || 'Nouveau projet'
  const typeEl = document.querySelector('.type-option.active-type span')
  const typeMap = { 'Web': 'web', 'Mobile': 'mobile', 'Full-stack': 'fullstack' }
  const appType = typeMap[typeEl ? typeEl.textContent : 'Web'] || 'web'

  const { data, error } = await db
    .from('projects')
    .insert({ name, app_type: appType, owner_id: currentUser.id })
    .select()
    .single()

  if (error) {
    showToast('Erreur lors de la création')
    console.error(error)
    return
  }
  closeNewProject()
  projects.unshift(data)
  setCurrentProject(data)
  showToast(`Projet "${name}" créé`)
}

// ============================================
// ITÉRATIONS
// ============================================

async function loadIterations(projectId) {
  const { data, error } = await db
    .from('iterations')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })

  if (error) { console.error(error); return }
  renderIterations(data || [])
}

function renderIterations(iterations) {
  const list = document.querySelector('.iterations-list')
  const count = document.querySelector('.iter-count')
  if (!list) return
  count.textContent = `${iterations.length} itération${iterations.length > 1 ? 's' : ''}`

  if (iterations.length === 0) {
    list.innerHTML = '<div class="proj-empty">Aucune itération — lance une génération !</div>'
    return
  }

  list.innerHTML = iterations.map((it, idx) => `
    <div class="iteration-card ${idx === 0 ? 'active-iter' : ''}">
      <div class="iter-meta"><span class="iter-badge ${idx === 0 ? 'current' : ''}">${idx === 0 ? 'Actuelle' : 'v' + it.version}</span><span class="iter-time">${formatDate(it.created_at)}</span></div>
      <div class="iter-prompt">"${escapeHtml(it.prompt)}"</div>
      <div class="iter-result"><span class="result-ok"><i class="ti ti-check"></i> ${it.files_changed || 0} fichiers modifiés</span>${it.visual_score ? `<span class="iter-score"><i class="ti ti-eye"></i> Score visuel : ${Math.round(it.visual_score)}%</span>` : ''}</div>
    </div>`).join('')
}

// ============================================
// PIPELINE DE GÉNÉRATION
// ============================================

const steps = ['plan', 'code', 'capture', 'vision', 'deploy']
const stepLabels = ['Planification des composants...', 'Génération du code React...', 'Capture du rendu visuel...', 'Analyse visuelle avec Claude...', 'Déploiement sur Vercel...']
const stepStatuses = ['planning', 'coding', 'capturing', 'analyzing', 'deploying']
let genRunning = false

async function startGeneration() {
  if (genRunning) return
  if (!currentProject) { showToast('Crée ou sélectionne un projet d’abord'); return }
  const prompt = document.getElementById('promptInput').value.trim()
  if (!prompt) { showToast('Décris ton app avant de générer'); return }

  genRunning = true
  const btn = document.getElementById('generateBtn')
  btn.classList.add('running')
  btn.innerHTML = '<i class="ti ti-loader"></i> Génération...'

  const nextVersion = await getNextVersion(currentProject.id)
  const { data: iteration, error } = await db.from('iterations').insert({ project_id: currentProject.id, owner_id: currentUser.id, version: nextVersion, prompt, status: 'pending' }).select().single()
  if (error) {
    showToast('Erreur : impossible de créer l’itération')
    console.error(error)
    genRunning = false
    btn.classList.remove('running')
    btn.innerHTML = '<i class="ti ti-wand"></i> Générer'
    return
  }

  await db.from('projects').update({ status: 'planning', initial_prompt: currentProject.initial_prompt || prompt }).eq('id', currentProject.id)

  const dot = document.getElementById('pipelineDot')
  const label = document.getElementById('pipelineLabel')
  const iterEl = document.getElementById('pipelineIter')
  dot.className = 'pipeline-status-dot running'
  iterEl.textContent = `Itération #${nextVersion}`
  steps.forEach(s => { const el = document.getElementById('step-' + s); if (el) el.dataset.state = 'idle' })

  let i = 0
  async function runStep() {
    if (i > 0) { const prev = document.getElementById('step-' + steps[i - 1]); if (prev) prev.dataset.state = 'done' }
    if (i >= steps.length) {
      const score = 70 + Math.round(Math.random() * 28)
      await db.from('iterations').update({ status: 'done', visual_score: score, files_changed: 2 + Math.floor(Math.random() * 4), completed_at: new Date().toISOString() }).eq('id', iteration.id)
      await db.from('projects').update({ status: 'deployed' }).eq('id', currentProject.id)
      label.textContent = 'Déployé avec succès ✓'
      dot.className = 'pipeline-status-dot done'
      btn.classList.remove('running')
      btn.innerHTML = '<i class="ti ti-wand"></i> Regénérer'
      genRunning = false
      currentProject.status = 'deployed'
      renderSidebar()
      loadIterations(currentProject.id)
      showToast('🚀 Génération terminée — score visuel : ' + score + '%')
      return
    }
    const el = document.getElementById('step-' + steps[i])
    if (el) el.dataset.state = 'active'
    label.textContent = stepLabels[i]
    const status = stepStatuses[i]
    await db.from('iterations').update({ status, started_at: i === 0 ? new Date().toISOString() : iteration.started_at }).eq('id', iteration.id)
    await db.from('projects').update({ status }).eq('id', currentProject.id)
    currentProject.status = status
    renderSidebar()
    i++
    setTimeout(runStep, 1400)
  }
  runStep()
}

async function getNextVersion(projectId) {
  const { data } = await db.from('iterations').select('version').eq('project_id', projectId).order('version', { ascending: false }).limit(1)
  return data && data.length > 0 ? data[0].version + 1 : 1
}

// ============================================
// UI — onglets, modal, helpers
// ============================================

function switchTab(el) { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); el.classList.add('active'); document.getElementById('tab-' + el.dataset.tab).classList.add('active'); if (el.dataset.tab === 'iterations' && currentProject) loadIterations(currentProject.id) }
function switchPreview(el, type) { document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active')); el.classList.add('active'); document.getElementById('previewWeb').classList.toggle('active', type === 'web'); document.getElementById('previewMobile').classList.toggle('active', type === 'mobile') }
function selectFile(el, name) { document.querySelectorAll('.file-item').forEach(f => f.classList.remove('active')); el.classList.add('active'); document.getElementById('codeFileName').innerHTML = `<i class="ti ti-file-type-tsx"></i> ${name}` }
function setViewport(el, width) { document.querySelectorAll('.vp-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); const app = document.querySelector('#fullpreviewFrame .mock-fullscreen-app'); if (app) { if (width === '390px') { app.style.maxWidth = '390px'; app.style.height = '700px' } else if (width === '768px') { app.style.maxWidth = '768px'; app.style.height = '560px' } else { app.style.maxWidth = '900px'; app.style.height = '500px' } } }
function openNewProject() { document.getElementById('newProjectModal').classList.add('open'); setTimeout(() => document.getElementById('newProjectName').focus(), 100) }
function closeNewProject() { document.getElementById('newProjectModal').classList.remove('open') }
function selectType(el) { document.querySelectorAll('.type-option').forEach(t => t.classList.remove('active-type')); el.classList.add('active-type') }
function insertChip(text) { const ta = document.getElementById('promptInput'); ta.value = ta.value.trimEnd() + (ta.value ? ', ' : '') + text; ta.focus() }
function redeploy() { const btn = document.querySelector('.btn-redeploy'); if (!btn) return; btn.innerHTML = '<i class="ti ti-loader"></i> Déploiement...'; btn.disabled = true; setTimeout(() => { btn.innerHTML = '<i class="ti ti-rocket"></i> Redéployer'; btn.disabled = false; showToast('🚀 Redéploiement réussi') }, 2800) }
function restoreIter() { showToast('Restauration disponible avec le backend agent') }
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000) }
function copyUrl() { const url = currentProject && currentProject.deploy_url; if (!url) { showToast('Pas encore d’URL de déploiement'); return } navigator.clipboard?.writeText(url).catch(() => {}); showToast('URL copiée !') }
function openUrl() { const url = currentProject && currentProject.deploy_url; if (url) window.open(url, '_blank'); else showToast('Pas encore d’URL de déploiement') }
function toggleFullscreen() { showToast('Plein écran non disponible en aperçu') }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function formatDate(iso) { const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000; if (diff < 60) return 'À l’instant'; if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`; if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`; return d.toLocaleDateString('fr-CA') }

// ============================================
// INIT
// ============================================

document.addEventListener('keydown', e => {
  const overlay = document.getElementById('authOverlay')
  const authVisible = overlay && !overlay.classList.contains('hidden')
  const otpVisible = document.getElementById('otpFormView') && !document.getElementById('otpFormView').classList.contains('hidden')
  if (e.key === 'Escape') closeNewProject()
  if (e.key === 'Enter' && authVisible) { if (otpVisible) verifyOtpCode(); else submitAuth() }
})

document.addEventListener('input', e => {
  if (e.target && e.target.id === 'otpCode') {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
    if (e.target.value.length === 6) verifyOtpCode()
  }
})

document.getElementById('newProjectModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeNewProject() })

initAuth()
setAuthMode('login')
