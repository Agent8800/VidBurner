const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const https = require('https');

const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN'); // Replace with your bot token
const subtitlePath = '/path/to/subtitles.srt'; // Replace with the actual path to your subtitles file

// Command handler for /start
bot.start((ctx) => {
  ctx.reply('Welcome! Send me a video with the /burnsub command to burn subtitles into it.');
});

// Command handler for /burnsub
bot.command('burnsub', (ctx) => {
  // Check if the message contains a video
  if (ctx.message.video) {
    const fileId = ctx.message.video.file_id;
    const fileLink = ctx.telegram.getFileLink(fileId);
    
    // Start processing the video
    fileLink.then((link) => {
      const videoPath = `/path/to/video_${fileId}.mp4`; // Save the video with a unique name
      const outputFilePath = `/path/to/output_${fileId}.mp4`; // Save the output video with a unique name

      const downloadStream = fs.createWriteStream(videoPath);
      const request = https.get(link, function(response) {
        response.pipe(downloadStream);
      });

      downloadStream.on('finish', function() {
        // Video download completed, start processing
        let duration = 0;
        ffmpeg.ffprobe(videoPath, function(err, metadata) {
          duration = metadata.format.duration;
        });

        ffmpeg(videoPath)
          .outputOptions(`-vf subtitles=${subtitlePath}:force_style='Fontfile=font.ttf'`)
          .on('progress', (progress) => {
            const progressPercent = Math.floor((progress.percent / 1) * 100);
            ctx.reply(`Video processing: ${progressPercent}%`);
          })
          .on('error', (err) => {
            console.error('Error occurred during video processing:', err);
            ctx.reply('Error occurred during video processing.');
          })
          .on('end', () => {
            // Video processing completed
            ctx.replyWithVideo({ source: outputFilePath });
          })
          .save(outputFilePath);
      });
    });
  } else {
    ctx.reply('Please upload a video to burn subtitles.');
  }
});

bot.launch();
