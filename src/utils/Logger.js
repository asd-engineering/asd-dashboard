export class Logger {
  constructor (fileName) {
    // Remove the .js extension if it exists
    this.fileName = fileName.replace(/\.js$/, '')
    this.isEnabled = this.checkLogStatus()
  }

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

  getCallingFunctionName () {
    try {
      const err = new Error()
      const stack = err.stack.split('\n')

      // Filter out Logger-related lines and non-relevant frames
      const caller = stack.find(line => !line.includes('Logger') && line.includes('at')) || ''

      // Extract the function name and remove the "at" prefix
      const match = caller.match(/at (.+) \(/)
      return match ? match[1].trim() : 'anonymous'
    } catch (e) {
      return 'anonymous'
    }
  }

  logMessage (level, ...args) {
    if (this.isEnabled) {
      const functionName = this.getCallingFunctionName()
      const logPrefix = `[${this.fileName}][${functionName}]`
      console[level](`${logPrefix}`, ...args)
    }
  }

  log (...args) {
    this.logMessage('log', ...args)
  }

  warn (...args) {
    this.logMessage('warn', ...args)
  }

  error (...args) {
    this.logMessage('error', ...args)
  }

  info (...args) {
    this.logMessage('info', ...args)
  }

  static enableLogs (files = 'all') {
    localStorage.setItem('log', files)
  }

  static disableLogs () {
    localStorage.removeItem('log')
  }

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
