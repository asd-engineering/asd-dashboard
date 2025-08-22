// @ts-check
import { matchPattern } from './match-pattern.js'
/**
 * Lightweight renderer to edit plain objects as HTML inputs.
 * Supports nested objects and arrays with add/remove controls.
 *
 * @module json-form
 * @class JsonForm
 */

/**
 * Options for JsonForm rendering.
 *
 * @typedef {object} JsonFormOptions
 * @property {{enabled:boolean, order?:string[], labels?:Record<string,string>}} [topLevelTabs]
 * @property {Record<string, any>} [templates]
 * @property {Record<string, string>} [placeholders]
 * @property {string} [rootPath]
 */
export class JsonForm {
  /**
   * Create a JsonForm instance.
   *
   * @param {HTMLElement} container element that will host the form
   * @param {object} [data={}] initial object to render
   * @param {JsonFormOptions} [options] optional behavior overrides
   */
  constructor (container, data = {}, options = {}) {
    this.container = container
    this.templates = options.templates || {}
    this.placeholders = options.placeholders || {}
    this.topLevelTabs = options.topLevelTabs
    this.rootPath = options.rootPath || ''
    /** @type {string|undefined} */
    this.activeTab = undefined
    this.setValue(data)
  }

  /**
   * Replace current data and re-render the form.
   *
   * @param {object} data new object to display
   */
  setValue (data) {
    this.data = structuredClone(data)
    const prevTab = this.activeTab
    this.container.innerHTML = ''

    const tabsOpt = this.topLevelTabs
    const keys = data && typeof data === 'object' ? Object.keys(data) : []
    if (tabsOpt?.enabled && keys.length > 1) {
      const order = Array.isArray(tabsOpt.order) ? tabsOpt.order : []
      const labels = tabsOpt.labels || {}
      const sorted = [...order.filter(k => keys.includes(k)), ...keys.filter(k => !order.includes(k))]
      const tabBar = document.createElement('div')
      tabBar.className = 'jf-subtabs'
      const content = document.createElement('div')
      this.container.append(tabBar, content)

      this.activeTab = prevTab && keys.includes(prevTab) ? prevTab : sorted[0]

      const render = () => {
        content.innerHTML = ''
        if (this.activeTab) {
          content.appendChild(this.#renderSection(this.activeTab))
        }
        Array.from(tabBar.children).forEach(btn => {
          const b = /** @type {HTMLButtonElement} */(btn)
          b.classList.toggle('active', b.dataset.key === this.activeTab)
        })
      }

      sorted.forEach(k => {
        const btn = document.createElement('button')
        btn.textContent = labels[k] || k
        btn.dataset.key = k
        btn.addEventListener('click', () => {
          this.activeTab = k
          render()
        })
        tabBar.appendChild(btn)
      })

      render()
    } else {
      this.activeTab = undefined
      this.container.appendChild(this.#renderNode(this.data, undefined, undefined, this.rootPath))
    }
  }

  /**
   * Get current object value.
   *
   * @returns {object}
   */
  getValue () {
    return structuredClone(this.data)
  }

  /**
   * Render any value type.
   *
   * @param {*} value
   * @param {object|Array} [parent]
   * @param {string|number} [key]
   * @param {string} path
   * @returns {HTMLElement}
   */
  #renderNode (value, parent, key, path = '') {
    if (Array.isArray(value)) return this.#renderArray(value, parent, key, path)
    if (value && typeof value === 'object') return this.#renderObject(value, parent, key, path)
    return this.#renderPrimitive(value, parent, key, path)
  }

  /**
   * Render selected top-level section.
   *
   * @param {string} key
   * @returns {HTMLElement}
   */
  #renderSection (key) {
    return this.#renderNode(this.data[key], this.data, key, key)
  }

  /**
   * Render object properties.
   *
   * @param {object} obj
   * @param {object|Array|undefined} parent
   * @param {string|number|undefined} key
   * @param {string} path
   * @returns {HTMLElement}
  */
  #renderObject (obj, parent, key, path) {
    const wrap = document.createElement('div')
    wrap.className = 'jf-object'
    Object.keys(obj).forEach(k => {
      const row = document.createElement('div')
      row.className = 'jf-row'
      const label = document.createElement('label')
      label.textContent = k
      row.appendChild(label)
      row.appendChild(this.#renderNode(obj[k], obj, k, path ? path + '.' + k : k))
      wrap.appendChild(row)
    })
    return wrap
  }

  /**
   * Render array with add/remove controls.
   *
   * @param {Array} arr
   * @param {object|Array|undefined} parent
   * @param {string|number|undefined} key
   * @param {string} path
   * @returns {HTMLElement}
  */
  #renderArray (arr, parent, key, path) {
    const wrap = document.createElement('div')
    wrap.className = 'jf-array'
    arr.forEach((item, i) => {
      const row = document.createElement('div')
      row.className = 'jf-row'
      row.appendChild(this.#renderNode(item, arr, i, path + '[' + i + ']'))
      const del = document.createElement('button')
      del.type = 'button'
      del.textContent = '−'
      del.classList.add('array__remove')
      del.addEventListener('click', () => {
        arr.splice(i, 1)
        this.setValue(this.data)
      })
      row.appendChild(del)
      wrap.appendChild(row)
    })
    const add = document.createElement('button')
    add.type = 'button'
    add.textContent = '+'
    add.classList.add('array__add')
    add.addEventListener('click', () => {
      const itemPath = path + '[' + arr.length + ']'
      let next = matchPattern(itemPath, this.templates)?.value
      if (next === undefined) next = this.#blankFor(arr[0])
      arr.push(next)
      this.setValue(this.data)
    })
    wrap.appendChild(add)
    return wrap
  }

  /**
   * Render a primitive input.
   *
   * @param {*} value
   * @param {object|Array} parent
   * @param {string|number} key
   * @param {string} path
   * @returns {HTMLElement}
  */
  #renderPrimitive (value, parent, key, path) {
    const name = String(key)
    let el
    const isNumKey = ['order', 'columns', 'rows', 'minColumns', 'maxColumns', 'minRows', 'maxRows', 'maxInstances'].includes(name) || typeof value === 'number'
    const isBoolKey = typeof value === 'boolean'
    if (isNumKey) {
      el = document.createElement('input')
      el.type = 'number'
      el.step = '1'
      if (['columns', 'rows', 'minColumns', 'maxColumns', 'minRows', 'maxRows', 'maxInstances'].includes(name)) el.min = '1'
      el.value = value == null ? '' : String(value)
      el.addEventListener('input', () => {
        const v = el.value
        parent[key] = v === '' ? null : parseInt(v, 10)
      })
    } else if (isBoolKey) {
      el = document.createElement('input')
      el.type = 'checkbox'
      el.checked = Boolean(value)
      el.addEventListener('change', () => {
        parent[key] = el.checked
      })
    } else {
      el = document.createElement('input')
      el.type = 'text'
      el.value = value == null ? '' : String(value)
      el.addEventListener('input', () => {
        parent[key] = el.value
      })
    }

    const ph = matchPattern(path, this.placeholders)
    if (ph && ph.kind === 'placeholder') el.placeholder = ph.value
    el.dataset.path = path
    return el
  }

  /**
   * Produce a blank value matching the sample's type.
   *
   * @param {*} sample
   * @returns {*}
   */
  #blankFor (sample) {
    const t = typeof sample
    if (t === 'number') return 0
    if (t === 'boolean') return false
    if (Array.isArray(sample)) return []
    if (sample && t === 'object') return {}
    return ''
  }
}
