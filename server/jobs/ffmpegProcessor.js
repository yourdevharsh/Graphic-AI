module.exports = async (job) => {
  console.log(`Processing video for Job ID: ${job.id}`);

  return { videoUrl: `/videos/${job.id}.mp4` };
};
