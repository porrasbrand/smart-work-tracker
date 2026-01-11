class SessionSegmenter {
  constructor(config) {
    this.idleGapMinutes = config.attribution.idleGapMinutes || 15;
    this.minSessionMinutes = config.attribution.minSessionMinutes || 5;
  }

  segment(events, metadata) {
    const segments = [];
    let currentSegment = null;

    // Filter events with timestamps and sort by time
    const timestampedEvents = events
      .filter(item => item.event && item.event.timestamp)
      .sort((a, b) => new Date(a.event.timestamp) - new Date(b.event.timestamp));

    if (timestampedEvents.length === 0) {
      return segments;
    }

    for (const item of timestampedEvents) {
      const event = item.event;
      const eventTime = new Date(event.timestamp);

      // Start new segment if:
      // 1. No current segment
      // 2. Gap > idle threshold
      if (!currentSegment) {
        currentSegment = this.createSegment(eventTime, metadata);
      } else {
        const gapMinutes = (eventTime - currentSegment.endTime) / (1000 * 60);

        if (gapMinutes > this.idleGapMinutes) {
          // Save current segment if long enough
          if (this.isSegmentValid(currentSegment)) {
            // Calculate final duration
            currentSegment.durationMinutes = Math.round(
              (currentSegment.endTime - currentSegment.startTime) / (1000 * 60)
            );
            segments.push(currentSegment);
          }
          // Start new segment
          currentSegment = this.createSegment(eventTime, metadata);
        } else {
          // Extend current segment
          currentSegment.endTime = eventTime;
        }
      }
    }

    // Save final segment
    if (currentSegment && this.isSegmentValid(currentSegment)) {
      currentSegment.durationMinutes = Math.round(
        (currentSegment.endTime - currentSegment.startTime) / (1000 * 60)
      );
      segments.push(currentSegment);
    }

    return segments;
  }

  createSegment(startTime, metadata) {
    return {
      startTime,
      endTime: startTime,
      cwd: metadata.cwd || null,
      gitBranch: metadata.gitBranch || null,
      durationMinutes: 0
    };
  }

  isSegmentValid(segment) {
    const duration = (segment.endTime - segment.startTime) / (1000 * 60);
    return duration >= this.minSessionMinutes;
  }
}

module.exports = SessionSegmenter;
