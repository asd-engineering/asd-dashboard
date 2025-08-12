// @ts-check
/**
 * Generic Service-style selector panel:
 * - Hover/keyboard open/close
 * - Search filter
 * - OPTIONAL right-side count (hidden when not configured)
 * - FIRST ROW = "Actions ▸" → opens side dropdown with action buttons
 * - OPTIONAL per-item icon actions (e.g., rename ✏️, delete 🗑) rendered on each row
 *
 * Emits DOM events (and also calls callbacks if provided):
 *   'panel:select'      { id }
 *   'panel:action'      { action, context }
 *   'panel:item-action' { action, id, context }
 *
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
 * @property {boolean} [showCount]
 * @property {(() => string) | null} [countText]
 * @property {(() => string) | null} [labelText]
  * @property {() => SelectorItem[]} getItems
 * @property {(id:string)=>void} [onSelect]
 * @property {(action:string, ctx:any)=>void} [onAction]
 * @property {(action:string, id:string, ctx:any)=>void} [onItemAction]
 * @property {() => any} [context]
 * @property {{label:string,action:string}[]} [actions]
 * @property {{action:string,title:string,icon:string}[]} [itemActions]
 */

/**
 * Generic service-style selector panel with optional side dropdown and per-item actions.
 * @class
 */
export class SelectorPanel {
  /**
   * @param {SelectorPanelCfg} cfg
   */
  constructor (cfg) {
    this.cfg = { showCount: true, labelText: null, ...cfg }
    this.timers = { openClose: /** @type {any} */ (null) }
    this.state = { sideOpen: false }
    this.dom = /** @type {any} */ ({})
    this.render()
    this.bind()
    this.refresh()
  }

  /** Render base DOM structure */
  render () {
    const { root, testid, placeholder, showCount, countText } = this.cfg
    root.innerHTML = ''

    const wrap = document.createElement('div')
    wrap.className = 'dropdown panel'
    wrap.dataset.testid = testid
    wrap.setAttribute('role', 'menu')
    wrap.tabIndex = 0

    const arrow = document.createElement('span')
    arrow.className = 'panel-arrow'
    arrow.textContent = '▼'

    const label = document.createElement('span')
    label.className = 'panel-label'
    label.style.display = 'none'

    const input = document.createElement('input')
    input.className = 'panel-search'
    input.placeholder = placeholder

    let count = null
    if (showCount && typeof countText === 'function') {
      count = document.createElement('span')
      count.className = 'panel-count'
    }

    const content = document.createElement('div')
    content.className = 'dropdown-content'

    // right-side submenu content (hidden by default)
    const side = document.createElement('div')
    side.className = 'side-content'
    content.appendChild(side)

    const list = document.createElement('div')
    list.className = 'panel-list'
    content.appendChild(list)

    wrap.append(arrow, label, input)
    if (count) wrap.append(count)
    wrap.appendChild(content)
    root.appendChild(wrap)

    this.dom = { root, wrap, input, arrow, label, count, content, list, side }
  }

  /** Bind DOM events */
  bind () {
    const open = () => { this.dom.wrap.classList.add('open') }
    const close = () => { this.dom.wrap.classList.remove('open'); this.closeSide() }
    const schedule = (fn, ms) => { clearTimeout(this.timers.openClose); this.timers.openClose = setTimeout(fn, ms) }

    const onEnter = () => schedule(open, 0)
    const onLeave = () => schedule(close, 200)

    for (const el of [this.dom.wrap, this.dom.content]) {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    }

    this.dom.wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.state.sideOpen) this.closeSide()
        else this.dom.wrap.classList.remove('open')
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.dom.wrap.classList.add('open')
      } else if (e.key === 'ArrowLeft') {
        if (this.state.sideOpen) this.closeSide()
        else this.dom.wrap.classList.remove('open')
      }
    })

    this.dom.input.addEventListener('input', () => this.filter(this.dom.input.value))

    // clicks inside list: actions first, then selection
    this.dom.list.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target)
      const itemBtn = target.closest('[data-item-action]')
      if (itemBtn) {
        e.preventDefault()
        e.stopPropagation()
        const action = /** @type {HTMLElement} */ (itemBtn).dataset.itemAction || ''
        const row = target.closest('[data-id]')
        const id = row ? /** @type {HTMLElement} */ (row).dataset.id || '' : ''
        this.dispatchItemAction(action, id)
        return
      }
      const actionsTrigger = target.closest('[data-testid="panel-actions-trigger"]')
      if (actionsTrigger) {
        e.preventDefault()
        this.toggleSide(true, { focusFirst: true })
        return
      }
      const row = target.closest('[data-id]')
      if (row) {
        e.preventDefault()
        this.dispatchSelect(/** @type {HTMLElement} */ (row).dataset.id || '')
        this.dom.wrap.classList.remove('open')
      }
    })

    // side buttons
    this.dom.side.addEventListener('click', (e) => {
      const btn = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target.closest('[data-action]') : null)
      if (!btn) return
      e.preventDefault()
      this.dispatchAction(btn.dataset.action || '')
      this.dom.wrap.classList.remove('open')
      this.closeSide()
    })

    // Keyboard: ArrowRight on first row opens side
    this.dom.list.addEventListener('keydown', (e) => {
      const onFirstRow = /** @type {HTMLElement|null} */ (
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest('[data-testid="panel-actions-trigger"]')
          : null
      )
      if (onFirstRow && e.key === 'ArrowRight') {
        e.preventDefault()
        this.toggleSide(true, { focusFirst: true })
      }
    })
  }

  /** Refresh list and counts */
  refresh () {
    const { getItems, showCount, countText, labelText, actions = [], itemActions = [] } = this.cfg

    if (this.dom.label) {
      if (typeof labelText === 'function') {
        const txt = labelText()
        this.dom.label.textContent = txt
        this.dom.label.title = txt
        this.dom.label.style.display = ''
      } else {
        this.dom.label.style.display = 'none'
      }
    }

    if (this.dom.count) {
      if (showCount && typeof countText === 'function') {
        const txt = countText()
        if (txt) {
          this.dom.count.textContent = txt
          this.dom.count.style.display = ''
        } else {
          this.dom.count.style.display = 'none'
        }
      } else {
        this.dom.count.style.display = 'none'
      }
    }

    this.dom.list.innerHTML = ''
    this.dom.side.innerHTML = ''

    // First row: actions trigger + side content (if any actions are configured)
    if (actions.length) {
      const trigger = document.createElement('div')
      trigger.className = 'panel-item panel-actions-trigger'
      trigger.dataset.testid = 'panel-actions-trigger'
      trigger.tabIndex = 0
      trigger.innerHTML = '<span class="panel-item-label">Actions ▸</span>'
      this.dom.list.appendChild(trigger)

      for (const a of actions) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'panel-action'
        b.dataset.action = a.action
        b.textContent = a.label
        this.dom.side.appendChild(b)
      }
    }

    const items = getItems()
    for (const it of items) {
      const row = document.createElement('div')
      row.className = 'panel-item'
      row.dataset.id = it.id
      row.dataset.filterable = `${it.label} ${it.meta || ''}`
      row.tabIndex = 0

      const left = document.createElement('span')
      left.className = 'panel-item-label'
      left.textContent = it.label
      row.appendChild(left)

      if (it.meta) {
        const meta = document.createElement('span')
        meta.className = 'panel-item-meta'
        meta.textContent = ` ${it.meta}`
        row.appendChild(meta)
      }

      // inline actions on the right
      if (itemActions.length) {
        const acts = document.createElement('span')
        acts.className = 'panel-item-actions'
        for (const a of itemActions) {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'panel-item-icon'
          b.dataset.itemAction = a.action
          b.title = a.title
          b.setAttribute('aria-label', a.title)
          b.textContent = a.icon
          acts.appendChild(b)
        }
        row.appendChild(acts)
      }

      this.dom.list.appendChild(row)
    }
  }

  /**
   * Filter visible items by query
   * @param {string} q
   */
  filter (q) {
    const needle = (q || '').toLowerCase()
    this.dom.list.querySelectorAll('.panel-item').forEach(el => {
      if (el.classList.contains('panel-actions-trigger')) return
      const txt = (el.getAttribute('data-filterable') || '').toLowerCase()
      el.toggleAttribute('hidden', !txt.includes(needle))
    })
  }

  /** Toggle side panel */
  toggleSide (open, opts = /** @type {{focusFirst?:boolean}} */({})) {
    if (open) {
      this.dom.content.classList.add('side-open')
      this.state.sideOpen = true
      if (opts.focusFirst) this.dom.side.querySelector('button')?.focus()
    } else {
      this.dom.content.classList.remove('side-open')
      this.state.sideOpen = false
    }
  }

  /** Close side panel */
  closeSide () { this.toggleSide(false) }

  /** Dispatch selection */
  dispatchSelect (id) {
    this.dom.wrap.dispatchEvent(new CustomEvent('panel:select', { bubbles: true, detail: { id } }))
    if (typeof this.cfg.onSelect === 'function') this.cfg.onSelect(id)
  }

  /** Dispatch top-level action */
  dispatchAction (action) {
    const ctx = this.cfg.context ? this.cfg.context() : null
    this.dom.wrap.dispatchEvent(new CustomEvent('panel:action', { bubbles: true, detail: { action, context: ctx } }))
    if (typeof this.cfg.onAction === 'function') this.cfg.onAction(action, ctx)
  }

  /** Dispatch per-item action */
  dispatchItemAction (action, id) {
    const ctx = this.cfg.context ? this.cfg.context() : null
    this.dom.wrap.dispatchEvent(new CustomEvent('panel:item-action', { bubbles: true, detail: { action, id, context: ctx } }))
    if (typeof this.cfg.onItemAction === 'function') this.cfg.onItemAction(action, id, ctx)
  }
}
