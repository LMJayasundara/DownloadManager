const cp = require('child_process');
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');

function getCustomVideoMetadata(videoFilePath) {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'error',                     // Hide all warnings
            '-show_entries', 'format_tags=comment, title, shan', // Only show the comment tag in the format section
            '-of', 'json',                     // Output format as JSON
            videoFilePath                      // File to analyze
        ];

        const ffprobeProcess = cp.spawn(ffprobePath, args);

        let output = '';
        ffprobeProcess.stdout.on('data', (chunk) => {
            output += chunk;  // Append the output
        });

        ffprobeProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`); // Log any errors
        });

        ffprobeProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`ffprobe exited with code ${code}`));
            } else {
                try {
                    const parsedData = JSON.parse(output); // Parse the JSON output
                    resolve(parsedData);
                } catch (e) {
                    reject(new Error('Failed to parse ffprobe output: ' + e.message));
                }
            }
        });
    });
}