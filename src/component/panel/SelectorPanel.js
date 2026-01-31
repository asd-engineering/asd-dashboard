// @ts-check
import { emojiList } from '../../ui/unicodeEmoji.js'
import { installHoverIntent } from './selector-hover-intent.js'
import { createStickyPopover } from '../../shared/ui/index.js'
/**
 * Generic selector panel with compact top menu and per-row flyout actions.
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
 * @typedef {{id:string,label:string,meta?:string,[key:string]:any}} SelectorItem
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
 * @property {{key:string,label:string}[]} [actions]
 * @property {{action:string,title:string,icon?:string}[]} [itemActions]
 * @property {(item:SelectorItem)=>{action:string,title:string,icon?:string}[]} [itemActionsFor]
 * @property {(item:SelectorItem)=>string} [selectVerb]
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
 * Detect if an action is a create-like action.
 * @param {{key?:string,label?:string}} a
 * @returns {boolean}
 */
function hasCreate (a) {
  const k = (a.key || '').toLowerCase()
  const l = (a.label || '').toLowerCase()
  return /create|new|add/.test(k) || /create|new|add/.test(l)
}

/**
 * Detect if an action is a reset-like action.
 * @param {{key?:string,label?:string}} a
 * @returns {boolean}
 */
function hasReset (a) {
  const k = (a.key || '').toLowerCase()
  const l = (a.label || '').toLowerCase()
  return /reset/.test(k) || /reset/.test(l)
}

/**
 * Generic selector panel with compact menu.
 * @class
 */
export class SelectorPanel {
  /**
   * Creates an instance of SelectorPanel.
   * @param {SelectorPanelCfg} cfg
   */
  constructor (cfg) {
    this.cfg = { showCount: true, labelText: null, ...cfg }
    this.timers = { openClose: /** @type {any} */ (null) }
    this.state = { wasFocused: false }
    this.dom = /** @type {any} */ ({})
    this.handlers = /** @type {any} */ ({})
    this.popovers = new WeakMap()
    this.currentPopover = null
    this.render()
    this.bind()
    this.refresh()
    this.hoverIntent = installHoverIntent({
      root: this.dom.wrap,
      selector: '.panel-item, .menu-item',
      delay: 50,
      activeClass: 'hover-active'
    })
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

    const spacer = document.createElement('span')
    spacer.className = 'panel-spacer'

    let count = null
    if (showCount && typeof countText === 'function') {
      count = document.createElement('span')
      count.className = 'panel-count'
    }

    const content = document.createElement('div')
    content.className = 'dropdown-content'

    const menu = document.createElement('div')
    menu.className = 'menu'
    const list = document.createElement('div')
    list.className = 'panel-list'
    content.append(menu, list)

    wrap.append(arrow, label, input, spacer)
    if (count) wrap.append(count)
    wrap.append(content)
    root.appendChild(wrap)

    this.dom = { root, wrap, input, arrow, label, count, spacer, content, menu, list }
  }

  /** Bind DOM events */
  bind () {
    const schedule = (fn, ms) => { clearTimeout(this.timers.openClose); this.timers.openClose = setTimeout(fn, ms) }

    const onEnter = () => schedule(() => this.open(), 0)
    const onLeave = () => schedule(() => this.close(), 200)

    for (const el of [this.dom.wrap, this.dom.content]) {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    }

    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        this.close()
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.open()
      }
    }
    this.dom.wrap.addEventListener('keydown', onKeydown)

    const onInput = () => this.filter(this.dom.input.value)
    this.dom.input.addEventListener('input', onInput)

    const onListClick = (e) => {
      const target = /** @type {HTMLElement} */ (e.target)
      const row = target.closest('[data-id]')
      if (row) {
        e.preventDefault()
        const id = /** @type {HTMLElement} */ (row).dataset.id || ''
        this.close()
        this.dispatchSelect(id)
      }
    }
    this.dom.list.addEventListener('click', onListClick)

    const onListKeydown = (e) => {
      const row = /** @type {HTMLElement|null} */ (
        e.target instanceof HTMLElement ? e.target.closest('[data-id]') : null
      )
      if (row && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        const id = row.dataset.id || ''
        this.close()
        this.dispatchSelect(id)
      }
    }
    this.dom.list.addEventListener('keydown', onListKeydown)

    const onMenuClick = (e) => {
      const target = /** @type {HTMLElement} */ (e.target)
      const item = target.closest('[data-menu-action]')
      if (item) {
        e.preventDefault()
        const action = /** @type {HTMLElement} */ (item).dataset.menuAction || ''
        this.close()
        this.dispatchAction(action)
      }
    }
    this.dom.menu.addEventListener('click', onMenuClick)

    const onMenuKeydown = (e) => {
      const el = /** @type {HTMLElement|null} */ (
        e.target instanceof HTMLElement ? e.target.closest('[data-menu-action]') : null
      )
      if (el && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        const action = el.dataset.menuAction || ''
        this.close()
        this.dispatchAction(action)
      }
    }
    this.dom.menu.addEventListener('keydown', onMenuKeydown)

    const onModalOpen = () => {
      const active = document.activeElement
      this.state.wasFocused = !!(active && this.dom.wrap.contains(active))
      this.close()
    }
    const onModalClose = () => {
      if (this.state.wasFocused) this.dom.wrap.focus()
      this.state.wasFocused = false
    }
    document.addEventListener('modal:open', onModalOpen)
    document.addEventListener('modal:close', onModalClose)

    this.handlers = { onEnter, onLeave, onKeydown, onInput, onListClick, onListKeydown, onMenuClick, onMenuKeydown, onModalOpen, onModalClose }
  }

  /** Refresh list and menu */
  refresh () {
    const { getItems, showCount, countText, labelText, actions = [], itemActions = [], itemActionsFor, selectVerb } = this.cfg

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

    this.dom.menu.innerHTML = ''
    this.dom.list.innerHTML = ''
    if (this.dom.empty) { this.dom.empty.remove(); this.dom.empty = null }
    this.currentPopover?.destroy()
    this.currentPopover = null
    this.popovers = new WeakMap()

    // build top menu
    if (actions.length === 1 && (hasCreate(actions[0]) || hasReset(actions[0]))) {
      const a = actions[0]
      const item = document.createElement('div')
      item.className = 'menu-item'
      item.dataset.menuAction = a.key
      item.tabIndex = 0
      item.setAttribute('role', 'menuitem')
      item.textContent = hasCreate(a)
        ? `${emojiList.plus.unicode} ${a.label}`
        : hasReset(a)
          ? `${emojiList.crossCycle.unicode} ${a.label}`
          : a.label
      item.title = a.label
      item.setAttribute('aria-label', a.label)
      this.dom.menu.appendChild(item)
    } else if (actions.length > 0) {
      const row = document.createElement('div')
      row.className = 'menu-item'
      row.tabIndex = 0
      row.setAttribute('role', 'menuitem')
      row.textContent = 'Actions ▸'
      const fly = document.createElement('div')
      fly.className = 'panel-item-actions-flyout'
      fly.setAttribute('role', 'menu')
      const sorted = [...actions].sort((a, b) => Number(hasCreate(b)) - Number(hasCreate(a)))
      for (const a of sorted) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'panel-action'
        b.dataset.menuAction = a.key
        const lbl = hasCreate(a)
          ? `${emojiList.plus.unicode} ${a.label}`
          : hasReset(a)
            ? `${emojiList.crossCycle.unicode} ${a.label}`
            : a.label
        b.textContent = lbl
        b.title = a.label
        b.setAttribute('aria-label', a.label)
        fly.appendChild(b)
      }
      row.appendChild(fly)
      this.dom.menu.appendChild(row)
    }

    const items = getItems()
    if (items.length === 0) {
      this.dom.list.style.display = 'none'
      const empty = document.createElement('div')
      empty.className = 'panel-empty'
      const createA = actions.find(hasCreate)
      if (createA) {
        const base = createA.label.replace(/^New\s+/i, '').trim()
        const plural = base.endsWith('s') ? base + 'es' : base + 's'
        const titleEl = document.createElement('div')
        titleEl.className = 'empty-title panel-empty-title'
        titleEl.textContent = `No ${plural} yet`
        empty.appendChild(titleEl)
      }
      this.dom.content.appendChild(empty)
      this.dom.empty = empty
      return
    }

    this.dom.list.style.display = ''

    for (const it of items) {
      const row = document.createElement('div')
      row.className = 'panel-item'
      row.dataset.id = it.id
      row.dataset.filterable = normalize(`${it.label} ${it.meta || ''}`)
      row.tabIndex = 0
      row.setAttribute('role', 'button')

      if (typeof selectVerb === 'function') {
        const verb = selectVerb(it)
        const lbl = `${verb}: ${it.label}`
        row.setAttribute('aria-label', lbl)
        row.title = lbl
      }

      const left = document.createElement('span')
      left.className = 'panel-item-label'
      left.textContent = it.label
      row.appendChild(left)

      const meta = document.createElement('span')
      meta.className = 'panel-item-meta'
      meta.textContent = it.meta ? ` ${it.meta}` : ''
      row.appendChild(meta)

      const placeholder = document.createElement('span')
      placeholder.className = 'panel-item-actions-placeholder'
      row.appendChild(placeholder)

      const hint = document.createElement('span')
      hint.className = 'panel-item-hint'
      hint.setAttribute('aria-hidden', 'true')
      if (typeof selectVerb === 'function') {
        const verb = selectVerb(it) === 'Add' ? 'add' : 'switch'
        hint.textContent = `Click to ${verb}`
      }
      row.appendChild(hint)

      const acts = document.createElement('div')
      acts.className = 'panel-item-actions-flyout'
      acts.setAttribute('role', 'menu')
      const pinBtn = document.createElement('button')
      pinBtn.type = 'button'
      pinBtn.className = 'panel-item-pin'
      pinBtn.textContent = '📌'
      acts.appendChild(pinBtn)
      const actionsArr = typeof itemActionsFor === 'function' ? itemActionsFor(it) : itemActions
      for (const a of actionsArr) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'panel-item-icon'
        b.dataset.itemAction = a.action
        b.title = a.title
        b.setAttribute('aria-label', a.title)
        b.textContent = a.icon || ''
        acts.appendChild(b)
      }
      row.appendChild(acts)

      const pop = createStickyPopover({ anchor: row, content: acts, strategy: 'absolute' })
      this.popovers.set(row, pop)
      row.addEventListener('mouseenter', () => { this.currentPopover = pop; pop.open() })
      row.addEventListener('mouseleave', () => { if (!pop.isPinned()) pop.close() })
      acts.addEventListener('click', (e) => {
        const tgt = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target.closest('[data-item-action]') : null)
        if (tgt) {
          e.preventDefault()
          e.stopPropagation()
          pop.pin()
          const action = tgt.dataset.itemAction || ''
          const id = row.dataset.id || ''
          this.dispatchItemAction(action, id)
        }
      })
      pinBtn.addEventListener('click', (e) => { e.stopPropagation(); pop.pin() })

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
      this.dom.wrap.dispatchEvent(new CustomEvent('selector:closed', { bubbles: true, composed: true }))
    }
  }

  /**
   * Dispatch selection
   * @param {string} id The ID of the selected item.
   */
  dispatchSelect (id) {
    this.dom.wrap.dispatchEvent(new CustomEvent('selector:select', { bubbles: true, composed: true, detail: { id } }))
    if (typeof this.cfg.onSelect === 'function') this.cfg.onSelect(id)
  }

  /**
   * Dispatch top-level action
   * @param {string} action The key of the action to dispatch.
   */
  dispatchAction (action) {
    const ctx = this.cfg.context ? this.cfg.context() : null
    this.dom.wrap.dispatchEvent(new CustomEvent('selector:action', { bubbles: true, composed: true, detail: { action, context: ctx } }))
    if (typeof this.cfg.onAction === 'function') this.cfg.onAction(action, ctx)
  }

  /**
   * Dispatch per-item action
   * @param {string} action The key of the item action.
   * @param {string} id The ID of the item.
   */
  dispatchItemAction (action, id) {
    const ctx = this.cfg.context ? this.cfg.context() : null
    this.dom.wrap.dispatchEvent(new CustomEvent('selector:item-action', { bubbles: true, composed: true, detail: { action, id, context: ctx } }))
    if (typeof this.cfg.onItemAction === 'function') this.cfg.onItemAction(action, id, ctx)
  }

  /** Unbind all event listeners */
  destroy () {
    const { wrap, content, list, input, menu } = this.dom
    wrap.removeEventListener('mouseenter', this.handlers.onEnter)
    wrap.removeEventListener('mouseleave', this.handlers.onLeave)
    content.removeEventListener('mouseenter', this.handlers.onEnter)
    content.removeEventListener('mouseleave', this.handlers.onLeave)
    wrap.removeEventListener('keydown', this.handlers.onKeydown)
    input.removeEventListener('input', this.handlers.onInput)
    list.removeEventListener('click', this.handlers.onListClick)
    list.removeEventListener('keydown', this.handlers.onListKeydown)
    menu.removeEventListener('click', this.handlers.onMenuClick)
    menu.removeEventListener('keydown', this.handlers.onMenuKeydown)
    document.removeEventListener('modal:open', this.handlers.onModalOpen)
    document.removeEventListener('modal:close', this.handlers.onModalClose)
    this.currentPopover?.destroy()
  }
}
