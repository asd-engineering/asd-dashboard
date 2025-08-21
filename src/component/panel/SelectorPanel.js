// @ts-check
import { emojiList } from '../../ui/unicodeEmoji.js'
/**
 * Generic Service-style selector panel:
 * - Hover/keyboard open/close
 * - Search filter (case/diacritic/whitespace normalized)
 * - OPTIONAL right-side count (hidden when not configured)
 * - FIRST ROW = "Actions ▸" → opens side dropdown with action buttons
 * - OPTIONAL per-item icon actions (e.g., rename ✏️, delete ⛔) rendered on each row
 *
 * Emits DOM events (CustomEvent with `{ bubbles:true, composed:true }`):
 *   'selector:select'      { id }
 *   'selector:action'      { action, context }
 *   'selector:item-action' { action, id, context }
 *   'selector:opened'
 *   'selector:closed'
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
 * @property {{action:string,title:string,icon?:string}[]} [itemActions]
*/

/**
 * Normalize strings for filtering.
 * @param {string} s
 * @returns {string}
 */
function normalize (s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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
    this.state = { sideOpen: false, wasFocused: false }
    this.dom = /** @type {any} */ ({})
    this.hoverFns = /** @type {any} */ ({})
    this.handlers = /** @type {any} */ ({})
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
    const schedule = (fn, ms) => { clearTimeout(this.timers.openClose); this.timers.openClose = setTimeout(fn, ms) }

    const onEnter = () => schedule(() => this.open(), 0)
    const onLeave = () => schedule(() => this.close(), 200)

    this.hoverFns = {
      enter: () => schedule(() => this.toggleSide(true), 0),
      leave: () => schedule(() => this.toggleSide(false), 200)
    }

    for (const el of [this.dom.wrap, this.dom.content]) {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    }

    this.dom.side.addEventListener('mouseenter', this.hoverFns.enter)
    this.dom.side.addEventListener('mouseleave', this.hoverFns.leave)

    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        if (this.state.sideOpen) this.closeSide()
        else this.close()
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.open()
      } else if (e.key === 'ArrowLeft') {
        if (this.state.sideOpen) this.closeSide()
        else this.close()
      }
    }
    this.dom.wrap.addEventListener('keydown', onKeydown)

    const onInput = () => this.filter(this.dom.input.value)
    this.dom.input.addEventListener('input', onInput)

    const onListClick = (e) => {
      const target = /** @type {HTMLElement} */ (e.target)
      const itemBtn = target.closest('[data-item-action]')
      if (itemBtn) {
        e.preventDefault()
        e.stopPropagation()
        const action = /** @type {HTMLElement} */ (itemBtn).dataset.itemAction || ''
        const row = target.closest('[data-id]')
        const id = row ? /** @type {HTMLElement} */ (row).dataset.id || '' : ''
        this.close()
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
        const id = /** @type {HTMLElement} */ (row).dataset.id || ''
        this.close()
        this.dispatchSelect(id)
      }
    }
    this.dom.list.addEventListener('click', onListClick)

    const onSideClick = (e) => {
      const btn = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target.closest('[data-action]') : null)
      if (!btn) return
      e.preventDefault()
      this.close()
      this.dispatchAction(btn.dataset.action || '')
    }
    this.dom.side.addEventListener('click', onSideClick)

    const onListKeydown = (e) => {
      const onFirstRow = /** @type {HTMLElement|null} */ (
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest('[data-testid="panel-actions-trigger"]')
          : null
      )
      if (onFirstRow && e.key === 'ArrowRight') {
        e.preventDefault()
        this.toggleSide(true, { focusFirst: true })
      }
    }
    this.dom.list.addEventListener('keydown', onListKeydown)

    // close on modal open/close
    this.handlers.onModalOpen = () => {
      const active = document.activeElement
      this.state.wasFocused = !!(active && this.dom.wrap.contains(active))
      this.close()
    }
    this.handlers.onModalClose = () => {
      if (this.state.wasFocused) this.dom.wrap.focus()
      this.state.wasFocused = false
    }
    document.addEventListener('modal:open', this.handlers.onModalOpen)
    document.addEventListener('modal:close', this.handlers.onModalClose)

    this.handlers.onEnter = onEnter
    this.handlers.onLeave = onLeave
    this.handlers.onKeydown = onKeydown
    this.handlers.onInput = onInput
    this.handlers.onListClick = onListClick
    this.handlers.onSideClick = onSideClick
    this.handlers.onListKeydown = onListKeydown
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

      trigger.addEventListener('mouseenter', this.hoverFns.enter)
      trigger.addEventListener('mouseleave', this.hoverFns.leave)

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
      row.dataset.filterable = normalize(`${it.label} ${it.meta || ''}`)
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
        const iconMap = {
          rename: emojiList.edit.unicode,
          delete: emojiList.noEntry.unicode
        }
        for (const a of itemActions) {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'panel-item-icon'
          b.dataset.itemAction = a.action
          b.title = a.title
          b.setAttribute('aria-label', a.title)
          b.textContent = a.icon || iconMap[a.action] || ''
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
    const needle = normalize(q)
    this.dom.list.querySelectorAll('.panel-item').forEach(el => {
      if (el.classList.contains('panel-actions-trigger')) return
      const txt = el.getAttribute('data-filterable') || ''
      el.toggleAttribute('hidden', !txt.includes(needle))
    })
  }

  /** Open dropdown */
  open () {
    if (!this.dom.wrap.classList.contains('open')) {
      this.dom.wrap.classList.add('open')
      this.dom.wrap.dispatchEvent(new CustomEvent('selector:opened', { bubbles: true, composed: true }))
    }
  }

  /** Close dropdown */
  close () {
    if (this.dom.wrap.classList.contains('open')) {
      this.dom.wrap.classList.remove('open')
      this.closeSide()
      this.dom.wrap.dispatchEvent(new CustomEvent('selector:closed', { bubbles: true, composed: true }))
    }
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
    this.dom.wrap.dispatchEvent(new CustomEvent('selector:select', { bubbles: true, composed: true, detail: { id } }))
    if (typeof this.cfg.onSelect === 'function') this.cfg.onSelect(id)
  }

  /** Dispatch top-level action */
  dispatchAction (action) {
    const ctx = this.cfg.context ? this.cfg.context() : null
    this.dom.wrap.dispatchEvent(new CustomEvent('selector:action', { bubbles: true, composed: true, detail: { action, context: ctx } }))
    if (typeof this.cfg.onAction === 'function') this.cfg.onAction(action, ctx)
  }

  /** Dispatch per-item action */
  dispatchItemAction (action, id) {
    const ctx = this.cfg.context ? this.cfg.context() : null
    this.dom.wrap.dispatchEvent(new CustomEvent('selector:item-action', { bubbles: true, composed: true, detail: { action, id, context: ctx } }))
    if (typeof this.cfg.onItemAction === 'function') this.cfg.onItemAction(action, id, ctx)
  }

  /** Unbind all event listeners */
  destroy () {
    const { wrap, content, side, list, input } = this.dom
    wrap.removeEventListener('mouseenter', this.handlers.onEnter)
    wrap.removeEventListener('mouseleave', this.handlers.onLeave)
    content.removeEventListener('mouseenter', this.handlers.onEnter)
    content.removeEventListener('mouseleave', this.handlers.onLeave)
    side.removeEventListener('mouseenter', this.hoverFns.enter)
    side.removeEventListener('mouseleave', this.hoverFns.leave)
    wrap.removeEventListener('keydown', this.handlers.onKeydown)
    input.removeEventListener('input', this.handlers.onInput)
    list.removeEventListener('click', this.handlers.onListClick)
    side.removeEventListener('click', this.handlers.onSideClick)
    list.removeEventListener('keydown', this.handlers.onListKeydown)
    document.removeEventListener('modal:open', this.handlers.onModalOpen)
    document.removeEventListener('modal:close', this.handlers.onModalClose)
  }
}
