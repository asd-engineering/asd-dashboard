export function openSaveServiceModal (url, onClose) {
  if (document.getElementById('save-service-modal')) return

  const modal = document.createElement('div')
  modal.id = 'save-service-modal'
  modal.setAttribute('role', 'dialog')

  const message = document.createElement('p')
  message.textContent = 'Do you want to save this URL as a reusable service?'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Service name'
  input.required = true
  input.id = 'save-service-name'

  const buttonContainer = document.createElement('div')

  const saveButton = document.createElement('button')
  saveButton.textContent = 'Save & Close'
  saveButton.addEventListener('click', () => {
    const name = input.value.trim()
    if (!name) return
    const services = JSON.parse(localStorage.getItem('services') || '[]')
    services.push({ name, url })
    localStorage.setItem('services', JSON.stringify(services))
    const selector = document.getElementById('service-selector')
    if (selector) {
      const opt = document.createElement('option')
      opt.value = url
      opt.textContent = name
      selector.appendChild(opt)
    }
    closeModal()
  })

  const skipButton = document.createElement('button')
  skipButton.textContent = 'Skip'
  skipButton.addEventListener('click', () => closeModal())

  buttonContainer.appendChild(saveButton)
  buttonContainer.appendChild(skipButton)

  modal.appendChild(message)
  modal.appendChild(input)
  modal.appendChild(buttonContainer)
  document.body.appendChild(modal)

  function closeModal () {
    modal.remove()
    window.removeEventListener('keydown', handleEsc)
    window.removeEventListener('click', handleOutside)
    if (onClose) onClose()
  }

  function handleEsc (e) {
    if (e.key === 'Escape') closeModal()
  }

  function handleOutside (e) {
    if (e.target === modal) closeModal()
  }

  window.addEventListener('keydown', handleEsc)
  window.addEventListener('click', handleOutside)
}
