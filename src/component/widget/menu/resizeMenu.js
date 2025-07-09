// @ts-check
import emojiList from '../../../ui/unicodeEmoji.js'
import { saveWidgetState } from '../../../storage/widgetStatePersister.js'
import { fetchServices } from '../utils/fetchServices.js'
import { getConfig } from '../../../utils/getConfig.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('resizeMenu.js')

/**
 * @typedef {Object} WidgetDOM
 * @property {string} url
 * @property {string} columns
 * @property {string} rows
 */

/**
 * Extracts required widget dataset fields as typed object.
 * @param {HTMLElement} el
 * @returns {WidgetDOM}
 */
function extractWidgetDataset (el) {
  return {
    url: el.dataset.url,
    columns: el.dataset.columns,
    rows: el.dataset.rows
  }
}

/**
 * Resizes the widget horizontally by adjusting its grid column span.
 * @function resizeHorizontally
 * @param {HTMLElement} widget - The widget element to resize.
 * @param {boolean} [increase=true] - Whether to increase or decrease the size.
 * @returns {Promise<void>}
 */
async function resizeHorizontally (widget, increase = true) {
  try {
    const config = await getConfig()
    const services = await fetchServices()
    const widgetUrl = widget.dataset.url
    const serviceConfig = services.find(service => service.url === widgetUrl)?.config || {}

    const currentSpan = parseInt(widget.dataset.columns) || config.styling.widget.minColumns
    const newSpan = increase ? currentSpan + 1 : currentSpan - 1

    const minColumns = serviceConfig.minColumns || config.styling.widget.minColumns
    const maxColumns = serviceConfig.maxColumns || config.styling.widget.maxColumns

    // Apply constraints and provide visual feedback
    if (newSpan < minColumns) {
      widget.classList.add('below-min')
      logger.log('Cannot resize below minimum columns')
      return
    } else if (newSpan > maxColumns) {
      widget.classList.add('exceeding-max')
      logger.log('Cannot resize beyond maximum columns')
      return
    } else {
      widget.classList.remove('below-min', 'exceeding-max')
    }

    widget.dataset.columns = String(newSpan)
    widget.style.gridColumn = `span ${newSpan}`
    logger.log(`Widget resized horizontally to span ${newSpan} columns`)
    saveWidgetState(window.asd.currentBoardId, window.asd.currentViewId)

    // Log dimensions and overflow state of widget container
    const widgetContainer = document.getElementById('widget-container')
    logger.log('Widget Container Dimensions:', widgetContainer.getBoundingClientRect())
    logger.log('Widget Container Overflow:', window.getComputedStyle(widgetContainer).overflow)
  } catch (error) {
    logger.error('Error resizing widget horizontally:', error)
  }
}

/**
 * Resizes the widget vertically by adjusting its grid row span.
 * @function resizeVertically
 * @param {HTMLElement} widget - The widget element to resize.
 * @param {boolean} [increase=true] - Whether to increase or decrease the size.
 * @returns {Promise<void>}
 */
async function resizeVertically (widget, increase = true) {
  try {
    const config = await getConfig()
    const services = await fetchServices()
    const widgetUrl = widget.dataset.url
    const serviceConfig = services.find(service => service.url === widgetUrl)?.config || {}

    const currentSpan = parseInt(widget.dataset.rows) || config.styling.widget.minRows
    const newSpan = increase ? currentSpan + 1 : currentSpan - 1

    const minRows = serviceConfig.minRows || config.styling.widget.minRows
    const maxRows = serviceConfig.maxRows || config.styling.widget.maxRows

    // Apply constraints and provide visual feedback
    if (newSpan < minRows) {
      widget.classList.add('below-min')
      logger.log('Cannot resize below minimum rows')
      return
    } else if (newSpan > maxRows) {
      widget.classList.add('exceeding-max')
      logger.log('Cannot resize beyond maximum rows')
      return
    } else {
      widget.classList.remove('below-min', 'exceeding-max')
    }

    widget.dataset.rows = String(newSpan)
    widget.style.gridRow = `span ${newSpan}`
    logger.log(`Widget resized vertically to span ${newSpan} rows`)
    saveWidgetState(window.asd.currentBoardId, window.asd.currentViewId)

    // Log dimensions and overflow state of widget container
    const widgetContainer = document.getElementById('widget-container')
    logger.log('Widget Container Dimensions:', widgetContainer.getBoundingClientRect())
    logger.log('Widget Container Overflow:', window.getComputedStyle(widgetContainer).overflow)
  } catch (error) {
    logger.error('Error resizing widget vertically:', error)
  }
}

/**
 * Enlarges the widget both horizontally and vertically by one unit.
 * @function enlarge
 * @param {HTMLElement} widget - The widget element to enlarge.
 * @returns {Promise<void>}
 */
async function enlarge (widget) {
  try {
    await resizeHorizontally(widget, true)
    await resizeVertically(widget, true)
    logger.log('Widget enlarged')
  } catch (error) {
    logger.error('Error enlarging widget:', error)
  }
}

/**
 * Shrinks the widget both horizontally and vertically by one unit.
 * @function shrink
 * @param {HTMLElement} widget - The widget element to shrink.
 * @returns {Promise<void>}
 */
async function shrink (widget) {
  try {
    await resizeHorizontally(widget, false)
    await resizeVertically(widget, false)
    logger.log('Widget shrunk')
  } catch (error) {
    logger.error('Error shrinking widget:', error)
  }
}

/**
 * Shows the resize menu with directional arrows for a widget.
 * @function showResizeMenu
 * @param {HTMLElement} icon - The icon element that triggered the event.
 * @returns {Promise<void>}
 */
async function showResizeMenu (icon) {
  try {
    const widget = icon.closest('.widget-wrapper')
    if (!(widget instanceof HTMLElement)) {
      logger.error('Widget wrapper not found for resize menu')
      return
    }
    let menu = widget.querySelector('.resize-menu')
    if (menu && !(menu instanceof HTMLElement)) {
      logger.error('Resize menu element is not an HTMLElement')
      return
    }

    if (!menu) {
      menu = document.createElement('div')
      menu.className = 'resize-menu'

      const horizontalIncreaseButton = document.createElement('button')
      horizontalIncreaseButton.innerHTML = emojiList.arrowRight.unicode
      horizontalIncreaseButton.addEventListener('click', async () => await resizeHorizontally(widget, true))

      const horizontalDecreaseButton = document.createElement('button')
      horizontalDecreaseButton.innerHTML = emojiList.arrowLeft.unicode
      horizontalDecreaseButton.addEventListener('click', async () => await resizeHorizontally(widget, false))

      const verticalIncreaseButton = document.createElement('button')
      verticalIncreaseButton.innerHTML = emojiList.arrowUp.unicode
      verticalIncreaseButton.addEventListener('click', async () => await resizeVertically(widget, false))

      const verticalDecreaseButton = document.createElement('button')
      verticalDecreaseButton.innerHTML = emojiList.arrowDown.unicode
      verticalDecreaseButton.addEventListener('click', async () => await resizeVertically(widget, true))

      menu.appendChild(verticalDecreaseButton)
      menu.appendChild(horizontalIncreaseButton)
      menu.appendChild(verticalIncreaseButton)
      menu.appendChild(horizontalDecreaseButton)

      widget.appendChild(menu)

      menu.addEventListener('mouseover', () => {
        logger.log('Mouse over resize menu');
        /** @type {HTMLElement} */ (menu).style.display = 'block'
      })
      /** @type {(event: MouseEvent) => void} */
      const handleMouseOut = (event) => {
        logger.log('Mouse out resize menu')
        const target = event.relatedTarget
        if (!(target instanceof HTMLElement) || !target.classList.contains('widget-icon-resize')) {
          /** @type {HTMLElement} */ (menu).style.display = 'none'
        }
      }
      menu.addEventListener('mouseout', handleMouseOut)
    }
    if (menu instanceof HTMLElement) {
      menu.style.display = 'block'
    }
    logger.log('Resize menu shown')
  } catch (error) {
    logger.error('Error showing resize menu:', error)
  }
}

/**
 * Hides the resize menu for a widget.
 * @function hideResizeMenu
 * @param {HTMLElement} icon - The icon element that triggered the event.
 * @returns {Promise<void>}
 */
async function hideResizeMenu (icon) {
  try {
    const widget = icon.closest('.widget-wrapper')
    if (!(widget instanceof HTMLElement)) {
      logger.error('Widget wrapper not found for hideResizeMenu')
      return
    }
    const menu = widget.querySelector('.resize-menu')
    if (menu instanceof HTMLElement) {
      menu.style.display = 'none'
      logger.log('Resize menu hidden')
    }
  } catch (error) {
    logger.error('Error hiding resize menu:', error)
  }
}

/**
 * Shows a menu block with explicit size options (e.g., "2 columns, 3 rows").
 * @function showResizeMenuBlock
 * @param {HTMLElement} icon - The icon element that triggered the event.
 * @param {HTMLElement} widgetWrapper - The widget to show the menu for.
 * @returns {Promise<void>}
 */
async function showResizeMenuBlock (icon, widgetWrapper) {
  try {
    const widgetUrl = widgetWrapper.dataset.url
    const services = await fetchServices()
    const widgetService = services.find(service => service.url === widgetUrl)

    if (!widgetService || !widgetService.config) {
      logger.error(`No constraints found for URL: ${widgetUrl}`)
      return
    }

    const existingMenu = widgetWrapper.querySelector('.resize-menu-block')
    if (existingMenu) {
      existingMenu.remove()
    }

    const menu = document.createElement('div')
    menu.className = 'resize-menu-block'

    const { minColumns, maxColumns, minRows, maxRows } = widgetService.config

    const gridOptions = []
    for (let cols = minColumns; cols <= maxColumns; cols++) {
      for (let rows = minRows; rows <= maxRows; rows++) {
        gridOptions.push({ cols, rows })
      }
    }

    logger.log('Grid options:', gridOptions)

    gridOptions.forEach(option => {
      const button = document.createElement('button')
      button.textContent = `${option.cols} columns, ${option.rows} rows`
      button.addEventListener('click', async () => {
        await adjustWidgetSize(widgetWrapper, option.cols, option.rows)
        menu.remove()
        saveWidgetState(window.asd.currentBoardId, window.asd.currentViewId)
      })
      menu.appendChild(button)
    })

    menu.style.position = 'absolute'
    menu.style.top = '30px'
    menu.style.right = '5px'
    menu.style.zIndex = '20'

    menu.addEventListener('mouseleave', (event) => {
      logger.log('Mouse left resize-menu-block')
      hideResizeMenuBlock(widgetWrapper).catch(error => {
        logger.error('Error hiding resize menu:', error)
      })
    })

    widgetWrapper.appendChild(menu)
  } catch (error) {
    logger.error('Error showing resize menu block:', error)
  }
}

/**
 * Hides the resize menu block for a widget.
 * @function hideResizeMenuBlock
 * @param {HTMLElement} widgetWrapper - The widget to hide the menu from.
 * @returns {Promise<void>}
 */
async function hideResizeMenuBlock (widgetWrapper) {
  logger.log('Removing resize menu block')
  try {
    const menu = widgetWrapper.querySelector('.resize-menu-block')
    if (menu) {
      menu.remove()
      logger.log('Resize menu block hidden')
    } else {
      logger.log('No resize menu block to hide')
    }
  } catch (error) {
    logger.error('Error hiding resize menu block:', error)
  }
}

/**
 * Adjusts the widget size to a specific column and row span.
 * @function adjustWidgetSize
 * @param {HTMLElement} widgetWrapper - The widget to resize.
 * @param {number} columns - The target number of columns.
 * @param {number} rows - The target number of rows.
 * @returns {Promise<void>}
 */
async function adjustWidgetSize (widgetWrapper, columns, rows) {
  try {
    const config = await getConfig()
    const services = await fetchServices()
    const { url } = extractWidgetDataset(widgetWrapper)
    const serviceConfig = services.find(service => service.url === url)?.config || {}

    const minColumns = serviceConfig.minColumns || config.styling.widget.minColumns
    const maxColumns = serviceConfig.maxColumns || config.styling.widget.maxColumns
    const minRows = serviceConfig.minRows || config.styling.widget.minRows
    const maxRows = serviceConfig.maxRows || config.styling.widget.maxRows

    columns = Math.min(Math.max(columns, minColumns), maxColumns)
    rows = Math.min(Math.max(rows, minRows), maxRows)

    widgetWrapper.dataset.columns = String(columns)
    widgetWrapper.dataset.rows = String(rows)
    widgetWrapper.style.gridColumn = `span ${columns}`
    widgetWrapper.style.gridRow = `span ${rows}`
    logger.log(`Widget resized to ${columns} columns and ${rows} rows`)
  } catch (error) {
    logger.error('Error adjusting widget size:', error)
  }
}

export { resizeHorizontally, resizeVertically, enlarge, shrink, showResizeMenu, hideResizeMenu, showResizeMenuBlock, hideResizeMenuBlock, adjustWidgetSize }
