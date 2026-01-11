class DurationAdjuster {
  constructor(db, logger, config) {
    this.db = db;
    this.logger = logger;
    this.config = config;
    this.roundingIncrement = 30; // 30-minute increments
    this.minimumMinutes = 30; // 30-minute minimum per session
  }

  /**
   * Round duration up to nearest 30-minute increment with 30-minute minimum
   * Examples:
   *   1-30 min → 30 min
   *   31-60 min → 60 min
   *   61-90 min → 90 min
   *   91-120 min → 120 min
   */
  roundDuration(minutes) {
    if (minutes <= 0) return 0;

    // Round up to nearest increment
    const rounded = Math.ceil(minutes / this.roundingIncrement) * this.roundingIncrement;

    // Apply minimum
    return Math.max(this.minimumMinutes, rounded);
  }

  async adjustAllDurations(options = {}) {
    const { force = false } = options;

    this.logger.info('Starting duration adjustment', { force });

    // Get segments that need adjustment
    let query = `
      SELECT * FROM segments
      WHERE status != 'archived'
    `;

    if (!force) {
      query += ' AND (adjusted_duration_minutes IS NULL OR adjusted_duration_minutes = 0)';
    }

    const segments = await this.db.all(query);

    this.logger.info('Found segments to adjust', { count: segments.length });

    if (segments.length === 0) {
      return {
        adjusted: 0,
        totalOriginal: 0,
        totalAdjusted: 0,
        difference: 0
      };
    }

    let adjusted = 0;
    let totalOriginalMinutes = 0;
    let totalAdjustedMinutes = 0;

    for (const segment of segments) {
      const originalMinutes = segment.duration_minutes;
      const adjustedMinutes = this.roundDuration(originalMinutes);

      totalOriginalMinutes += originalMinutes;
      totalAdjustedMinutes += adjustedMinutes;

      await this.db.run(`
        UPDATE segments
        SET adjusted_duration_minutes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [adjustedMinutes, segment.id]);

      this.logger.debug('Duration adjusted', {
        segmentId: segment.id,
        original: originalMinutes,
        adjusted: adjustedMinutes,
        difference: adjustedMinutes - originalMinutes
      });

      adjusted++;
    }

    const differenceMinutes = totalAdjustedMinutes - totalOriginalMinutes;

    this.logger.info('Duration adjustment complete', {
      adjusted,
      totalOriginalHours: (totalOriginalMinutes / 60).toFixed(2),
      totalAdjustedHours: (totalAdjustedMinutes / 60).toFixed(2),
      differenceHours: (differenceMinutes / 60).toFixed(2)
    });

    return {
      adjusted,
      totalOriginal: (totalOriginalMinutes / 60).toFixed(2),
      totalAdjusted: (totalAdjustedMinutes / 60).toFixed(2),
      difference: (differenceMinutes / 60).toFixed(2)
    };
  }

  async getAdjustmentSummary() {
    const summary = await this.db.get(`
      SELECT
        COUNT(*) as total_segments,
        SUM(duration_minutes) as original_minutes,
        SUM(adjusted_duration_minutes) as adjusted_minutes,
        SUM(CASE WHEN adjusted_duration_minutes IS NULL THEN 1 ELSE 0 END) as unadjusted_count
      FROM segments
      WHERE status != 'archived'
    `);

    const originalHours = (summary.original_minutes / 60).toFixed(2);
    const adjustedHours = summary.adjusted_minutes ? (summary.adjusted_minutes / 60).toFixed(2) : '0.00';
    const differenceHours = ((summary.adjusted_minutes - summary.original_minutes) / 60).toFixed(2);

    return {
      totalSegments: summary.total_segments,
      unadjustedCount: summary.unadjusted_count,
      originalHours,
      adjustedHours,
      differenceHours
    };
  }
}

module.exports = DurationAdjuster;
