// @ts-check
/**
 * Generic selector panel with optional side actions.
 * @module SelectorPanel
 */

/**
 * @typedef {{id:string,label:string,meta?:string}} SelectorItem
 */

/**
 * @typedef {Object} SelectorPanelCfg
 * @property {HTMLElement} root
 * @property {string} testid
 * @property {string} placeholder
 * @property {() => string} countText
 * @property {() => SelectorItem[]} getItems
 * @property {(id:string)=>void} [onSelect]
 * @property {(action:string, ctx:any)=>void} [onAction]
 * @property {() => any} [context]
 * @property {{label:string,action:string}[]} [actions]
 */

/**
 * UI dropdown selector with optional side actions.
 * @class
 */
export class SelectorPanel {
  /**
   * @param {SelectorPanelCfg} cfg
   */
  constructor (cfg) {
    this.cfg = cfg
    this.root = cfg.root

    const container = document.createElement('div')
    container.className = 'dropdown panel'
    container.dataset.testid = cfg.testid

    const search = document.createElement('input')
    search.className = 'panel-search'
    search.placeholder = cfg.placeholder || ''

    const arrow = document.createElement('span')
    arrow.className = 'panel-arrow'
    arrow.textContent = '\u25BC'

    const count = document.createElement('span')
    count.className = 'panel-count'

    const content = document.createElement('div')
    content.className = 'dropdown-content'
    const list = document.createElement('div')
    list.className = 'panel-list'
    content.appendChild(list)

    container.appendChild(search)
    container.appendChild(arrow)
    container.appendChild(count)
    container.appendChild(content)

    this.container = container
    this.searchEl = search
    this.countEl = count
    this.listEl = list

    this.root.appendChild(container)

    // open/close behavior
    container.addEventListener('mouseenter', () => this.open())
    container.addEventListener('mouseleave', () => this.close())
    arrow.addEventListener('click', () => this.toggle())
    search.addEventListener('focus', () => this.open())

    // filter
    search.addEventListener('input', () => {
      this.filter(search.value)
    })

    this.refresh()
  }

  /** Refresh items and counts */
  refresh () {
    if (typeof this.cfg.countText === 'function') {
      this.countEl.textContent = this.cfg.countText()
    }

    // rebuild list
    this.listEl.innerHTML = ''

    if (Array.isArray(this.cfg.actions) && this.cfg.actions.length > 0) {
      const actRow = document.createElement('div')
      actRow.className = 'panel-item panel-actions'
      actRow.dataset.testid = 'panel-actions-trigger'
      actRow.textContent = 'Actions \u25B8'

      const side = document.createElement('div')
      side.className = 'side-content'
      this.cfg.actions.forEach(a => {
        const btn = document.createElement('button')
        btn.textContent = a.label
        btn.addEventListener('click', () => {
          this.dispatchAction(a.action)
          this.close()
        })
        side.appendChild(btn)
      })
      actRow.appendChild(side)
      actRow.addEventListener('mouseenter', () => actRow.classList.add('side-open'))
      actRow.addEventListener('mouseleave', () => actRow.classList.remove('side-open'))
      actRow.addEventListener('click', () => actRow.classList.toggle('side-open'))
      this.listEl.appendChild(actRow)
    }

    const items = this.cfg.getItems() || []
    items.forEach(item => {
      const el = document.createElement('div')
      el.className = 'panel-item'
      el.dataset.id = item.id
      el.dataset.filterable = `${item.label} ${item.meta || ''}`.toLowerCase()
      el.textContent = item.label + (item.meta ? ` (${item.meta})` : '')
      el.addEventListener('click', () => {
        this.dispatchSelect(item.id)
        this.close()
      })
      this.listEl.appendChild(el)
    })
  }

  /**
   * Filter visible items by term
   * @param {string} term
   */
  filter (term) {
    const t = term.toLowerCase()
    this.listEl.querySelectorAll('.panel-item').forEach(el => {
      const item = /** @type {HTMLElement} */ (el)
      if (item.classList.contains('panel-actions')) return
      const f = item.dataset.filterable || ''
      item.style.display = !t || f.includes(t) ? '' : 'none'
    })
  }

  /** Open the panel */
  open () { this.container.classList.add('open') }

  /** Close the panel */
  close () {
    this.container.classList.remove('open')
    const a = this.listEl.querySelector('.panel-actions')
    if (a) a.classList.remove('side-open')
  }

  /** Toggle panel open state */
  toggle () { this.container.classList.toggle('open') }

  /**
   * Dispatch select event
   * @param {string} id
   */
  dispatchSelect (id) {
    this.container.dispatchEvent(new CustomEvent('panel:select', { detail: { id } }))
    if (typeof this.cfg.onSelect === 'function') this.cfg.onSelect(id)
  }

  /**
   * Dispatch action event
   * @param {string} action
   */
  dispatchAction (action) {
    const ctx = typeof this.cfg.context === 'function' ? this.cfg.context() : undefined
    this.container.dispatchEvent(new CustomEvent('panel:action', { detail: { action, context: ctx } }))
    if (typeof this.cfg.onAction === 'function') this.cfg.onAction(action, ctx)
  }
}
