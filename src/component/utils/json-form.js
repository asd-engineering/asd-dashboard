// @ts-check
/**
 * Lightweight renderer to edit plain objects as HTML inputs.
 * Supports nested objects and arrays with add/remove controls.
 *
 * @module json-form
 * @class JsonForm
 */

/**
 * @typedef {object} JsonFormOptions
 * @property {{enabled:boolean, order?:string[], labels?:Record<string,string>}} [topLevelTabs]
 * @property {Record<string, any>} [templates]
 * @property {Record<string, string>} [placeholders]
 * @property {(parent?:object|Array, key?:string|number)=>*} [defaultResolver]
 * @property {Record<string,*>} [arrayDefaults]
 */
export class JsonForm {
  /**
   * @constructor
   * @param {HTMLElement} container element that will host the form
   * @param {object} [data={}] initial object to render
   * @param {JsonFormOptions} [options] optional behavior overrides
   */
  constructor (container, data = {}, options = {}) {
    this.container = container
    this.defaultResolver = options.defaultResolver
    this.arrayDefaults = options.arrayDefaults || {}
    this.templates = options.templates || {}
    this.placeholders = options.placeholders || {}
    this.topLevelTabs = options.topLevelTabs
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
      this.container.appendChild(this.#renderNode(this.data, undefined, undefined, ''))
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
    add.addEventListener('click', () => {
      arr.push(this.#defaultFor(arr[0], parent, key, path + '[]'))
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
   * @returns {HTMLElement}
   */
  #renderPrimitive (value, parent, key, path) {
    let el
    const t = typeof value
    if (t === 'number') {
      el = document.createElement('input')
      el.type = 'number'
      el.step = '1'
      el.value = String(value)
      if (['columns', 'rows', 'minColumns', 'minRows'].includes(String(key))) el.min = '1'
      el.addEventListener('input', () => {
        parent[key] = el.value === '' ? 0 : Number(el.value)
      })
    } else if (t === 'boolean') {
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

    const ph = this.#matchPattern(path, this.placeholders)
    if (typeof ph === 'string') el.placeholder = ph
    return el
  }

  /**
   * Guess default value for new array items.
   *
   * If the array already has a sample element, clone its structure.
   * Otherwise attempt to resolve a default from the provided resolver or map.
   *
   * @param {*} sample existing first array element used as a template
   * @param {object|Array|undefined} parent parent object/array containing the array
   * @param {string|number|undefined} key key under which the array resides in the parent
   * @returns {*}
   */
  #defaultFor (sample, parent, key, path) {
    const tpl = this.#matchPattern(path, this.templates)
    if (tpl !== undefined) return tpl

    let resolved
    if (typeof this.defaultResolver === 'function') {
      resolved = this.defaultResolver(parent, key)
    } else if (key !== undefined && key in this.arrayDefaults) {
      resolved = this.arrayDefaults[key]
    }
    if (resolved !== undefined) return structuredClone(resolved)

    if (sample !== undefined) {
      const t = typeof sample
      if (t === 'number') return 0
      if (t === 'boolean') return false
      if (Array.isArray(sample)) return []
      if (sample && t === 'object') return {}
      return ''
    }

    return ''
  }

  /**
   * Find the most specific match for a dotted/array path in a pattern map.
   *
   * @param {string} path
   * @param {Record<string, any>} patterns
   * @returns {*|undefined}
   */
  #matchPattern (path, patterns) {
    if (!patterns) return undefined
    let best
    for (const [pattern, val] of Object.entries(patterns)) {
      const regex = new RegExp('^' + pattern.replace(/\[\]/g, '\\[\\d+\\]').replace(/\./g, '\\.') + '$')
      if (regex.test(path)) {
        if (!best || pattern.length > best.pattern.length) {
          best = { pattern, val }
        }
      }
    }
    if (!best) return undefined
    const v = best.val
    return typeof v === 'object' ? structuredClone(v) : v
  }
}
