const fs = require('fs-extra')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')

// Define the folder containing the webm videos
const videoDir = path.join(__dirname, '../test-results')
const outputVideo = path.join(__dirname, '../merged-demo.webm')
const overlayDuration = 5 // Display the folder name for 5 seconds, you can adjust this

// Recursively get all webm files in subdirectories
const getVideoFiles = async (dir) => {
  const files = await fs.readdir(dir)
  let webmFiles = []

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = await fs.stat(fullPath)

    if (stat.isDirectory()) {
      const subFiles = await getVideoFiles(fullPath)
      webmFiles = webmFiles.concat(subFiles)
    } else if (file === 'video.webm') {
      webmFiles.push(fullPath) // Only add 'video.webm' to the list
    }
  }

  return webmFiles
}

// Add folder title overlay to a video
const addTitleOverlay = (inputVideo, outputPath, folderName) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideo)
      .videoFilters({
        filter: 'drawtext',
        options: {
          fontfile: '/path/to/font.ttf', // Path to a font file (optional)
          text: `${folderName}`, // Folder name as overlay
          fontsize: 24,
          fontcolor: 'blue@0.5', // Blue with 50% transparency
          x: '(w-text_w)/2', // Centered horizontally
          y: 'h-50', // 50px from the bottom
          box: 1,
          boxcolor: 'black@0.5', // Transparent black box for readability
          boxborderw: 5,
          enable: `between(t,0,${overlayDuration})` // Show overlay for first N seconds
        }
      })
      .on('start', () => {
        console.log(`Adding title overlay for: ${folderName}`)
      })
      .on('end', () => {
        console.log(`Title overlay added: ${outputPath}`)
        resolve()
      })
      .on('error', (err) => {
        console.error('Error adding title overlay:', err)
        reject(err)
      })
      .save(outputPath)
  })
}

// Merge videos using ffmpeg
const mergeVideos = (inputVideos, outputPath) => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()

    inputVideos.forEach((videoPath) => {
      command.input(videoPath)
    })

    command
      .on('start', () => {
        console.log('Merging videos...')
      })
      .on('end', () => {
        console.log('Videos merged successfully!')
        resolve()
      })
      .on('error', (err) => {
        console.error('Error during merging:', err)
        reject(err)
      })
      .mergeToFile(outputPath)
  })
}

(async () => {
  try {
    const videoFiles = await getVideoFiles(videoDir)
    if (videoFiles.length === 0) {
      console.log('No webm files found to merge.')
      return
    }

    // Step 1: Add title overlays to each video
    const processedVideos = []
    for (const videoFile of videoFiles) {
      const folderName = path.basename(path.dirname(videoFile)) // Get folder name
      const processedPath = path.join(path.dirname(videoFile), `processed-${path.basename(videoFile)}`)
      await addTitleOverlay(videoFile, processedPath, folderName) // Add title overlay
      processedVideos.push(processedPath)
    }

    // Step 2: Merge the processed videos
    await mergeVideos(processedVideos, outputVideo)
  } catch (error) {
    console.error('Error merging videos:', error)
  }
})()
