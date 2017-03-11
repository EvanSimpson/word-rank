var currentTimers = {};


function formatTime(time) {
  return time[0] + (time[1] / (1000 * 1000000) );
}

function time(label) {
  if (typeof currentTimers[label] == "undefined") {
    // no existing record, store the start time
    currentTimers[label] = process.hrtime();
    return;
  } else {
    // get the time diff from the start time
    var t = process.hrtime(currentTimers[label]);
    // remove the stored start time
    delete currentTimers[label]
    return t;
  }
}

module.exports = {
  time: time,
  formatTime: formatTime
};
