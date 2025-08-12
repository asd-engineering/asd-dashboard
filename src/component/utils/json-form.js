// @ts-check
/**
 * Lightweight renderer to edit plain objects as HTML inputs.
 * Supports nested objects and arrays with add/remove controls.
 *
 * @module json-form
 * @class JsonForm
 */
export class JsonForm {
  /**
   * @constructor
   * @param {HTMLElement} container element that will host the form
   * @param {object} [data={}] initial object to render
   */
  constructor (container, data = {}) {
    this.container = container
    this.setValue(data)
  }

  /**
   * Replace current data and re-render the form.
   *
   * @param {object} data new object to display
   */
  setValue (data) {
    this.data = structuredClone(data)
    this.container.innerHTML = ''
    this.container.appendChild(this.#renderNode(this.data))
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
  #renderNode (value, parent, key) {
    if (Array.isArray(value)) return this.#renderArray(value, parent, key)
    if (value && typeof value === 'object') return this.#renderObject(value, parent, key)
    return this.#renderPrimitive(value, parent, key)
  }

  /**
   * Render object properties.
   *
   * @param {object} obj
   * @param {object|Array|undefined} parent
   * @param {string|number|undefined} key
   * @returns {HTMLElement}
   */
  #renderObject (obj, parent, key) {
    const wrap = document.createElement('div')
    Object.keys(obj).forEach(k => {
      const label = document.createElement('label')
      label.className = 'modal__label'
      label.textContent = k
      wrap.appendChild(label)
      wrap.appendChild(this.#renderNode(obj[k], obj, k))
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
  #renderArray (arr, parent, key) {
    const wrap = document.createElement('div')
    arr.forEach((item, i) => {
      const row = document.createElement('div')
      row.style.display = 'flex'
      row.style.alignItems = 'center'
      row.style.gap = '0.25rem'
      row.appendChild(this.#renderNode(item, arr, i))
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
      arr.push(this.#defaultFor(arr[0]))
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
  #renderPrimitive (value, parent, key) {
    let el
    const t = typeof value
    if (t === 'number') {
      el = document.createElement('input')
      el.type = 'number'
      el.value = String(value)
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
    return el
  }

  /**
   * Guess default value for new array items.
   *
   * @param {*} sample
   * @returns {*}
   */
  #defaultFor (sample) {
    const t = typeof sample
    if (t === 'number') return 0
    if (t === 'boolean') return false
    if (Array.isArray(sample)) return []
    if (sample && t === 'object') return {}
    return ''
  }
}
