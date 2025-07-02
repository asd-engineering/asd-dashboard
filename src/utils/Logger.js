// @ts-check
/**
 * A simple browser console logger with runtime enable/disable support.
 * @class Logger
 */
export class Logger {
  /**
   * @constructor
   * @param {string} fileName - The filename where the logger is used
   */
  constructor (fileName) {
    // Remove the .js extension if it exists
    this.fileName = fileName.replace(/\.js$/, '')
    this.isEnabled = this.checkLogStatus()
    this.isPlaywright = navigator.webdriver === true
  }

  /**
   * Check whether logging is enabled for the current file.
   * Uses localStorage key `log` which may contain `'all'` or comma-separated filenames.
   *
   * @function checkLogStatus
   * @returns {boolean}
   */
  checkLogStatus () {
    const logSetting = localStorage.getItem('log')
    if (logSetting === 'all') {
      return true
    } else if (logSetting) {
      const enabledFiles = logSetting.split(',')
      return enabledFiles.includes(this.fileName)
    }
    return false
  }

  /**
   * Extracts the function name of the caller (if available) from the stack trace.
   *
   * @function getCallingFunctionName
   * @returns {string} Function name or 'anonymous'
   */
  getCallingFunctionName () {
    try {
      const err = new Error()
      const stack = err.stack.split('\n')
      const caller = stack.find(line => !line.includes('Logger') && line.includes('at')) || ''
      const match = caller.match(/at (.+) \(/)
      return match ? match[1].trim() : 'anonymous'
    } catch (e) {
      return 'anonymous'
    }
  }

  /**
   * Internal log writer, applies prefixes and optionally persists
   * structured logs into window._appLogs during Playwright test runs.
   *
   * @private
   * @function logMessage
   * @param {string} level - Console method to use ('log', 'warn', 'error', etc)
   * @param {...any} args - Arguments to log
   */
  logMessage (level, ...args) {
    const functionName = this.getCallingFunctionName()

    if (this.isEnabled) {
      const logPrefix = `[${this.fileName}][${functionName}]`
      console[level](logPrefix, ...args)
    }

    if (this.isPlaywright) {
      try {
        window._appLogs ??= []
        window._appLogs.push({
          file: this.fileName,
          fn: functionName,
          level,
          message: args.map(arg => {
            try {
              return typeof arg === 'string' ? arg : JSON.stringify(arg)
            } catch {
              return String(arg)
            }
          }).join(' '),
          time: new Date().toISOString()
        })
      } catch (e) {
        // fail silently if window access is restricted
      }
    }
  }

  /**
   * Output standard log.
   * @function log
   * @param {...any} args
   */
  log (...args) {
    this.logMessage('log', ...args)
  }

  /**
   * Output warning.
   * @function warn
   * @param {...any} args
   */
  warn (...args) {
    this.logMessage('warn', ...args)
  }

  /**
   * Output error.
   * @function error
   * @param {...any} args
   */
  error (...args) {
    this.logMessage('error', ...args)
  }

  /**
   * Output info.
   * @function info
   * @param {...any} args
   */
  info (...args) {
    this.logMessage('info', ...args)
  }

  /**
   * Persist a comma-separated list of files to log or 'all'.
   *
   * @param {string} [files='all'] - Files to enable logging for.
   * @function enableLogs
   * @returns {void}
   */
  static enableLogs (files = 'all') {
    localStorage.setItem('log', files)
  }

  /**
   * Disable all logging output.
   *
   * @function disableLogs
   * @returns {void}
   */
  static disableLogs () {
    localStorage.removeItem('log')
  }

  /**
   * Print the list of files currently logging to the console.
   *
   * @function listLoggedFiles
   * @returns {void}
   */
  static listLoggedFiles () {
    const logSetting = localStorage.getItem('log')
    if (logSetting === 'all') {
      console.log('Logging is enabled for all files')
    } else if (logSetting) {
      const enabledFiles = logSetting.split(',')
      console.log('Logging enabled for files:', enabledFiles)
    } else {
      console.log('Logging is disabled')
    }
  }
}
