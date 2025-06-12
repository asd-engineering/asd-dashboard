### How to Use the Logger

1. **Import and instantiate the logger:**

```javascript
// Assuming you are using ES6 imports, otherwise adjust accordingly.
const logger = new Logger('myFile.js');
```

2. **Logging in your code:**

```javascript
logger.log('This is a regular log message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.info('This is an info message');
```

3. **Enabling logs for specific files or globally:**

- Enable logs for specific files:

```javascript
Logger.enableLogs('myFile.js,anotherFile.js');
```

- Enable logs globally:

```javascript
Logger.enableLogs('all');
```

4. **Disabling logs:**

```javascript
Logger.disableLogs();
```

### Example:

You can set up logging for your project using localStorage as:

```javascript
localStorage.setItem('log', 'myFile.js'); // Enable logging for specific file
localStorage.setItem('log', 'all'); // Enable logging for all files
localStorage.removeItem('log'); // Disable all logs
```
