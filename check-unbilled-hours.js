const axios = require('axios');
const config = require('./config');

const apiUrl = config.activeCollab.apiUrl;
const apiToken = config.activeCollab.apiToken;

async function getUnbilledHours() {
  try {
    console.log('Fetching projects from ActiveCollab...\n');
    const projectsResponse = await axios.get(`${apiUrl}/api/v1/projects`, {
      headers: { 'X-Angie-AuthApiToken': apiToken }
    });

    const projects = projectsResponse.data.filter(p => !p.is_completed && !p.is_trashed);
    console.log(`Found ${projects.length} active projects\n`);

    const projectStats = [];
    let totalUnbilled = 0;
    let totalBilled = 0;

    for (const project of projects) {
      try {
        // Get time records for each project
        const timeResponse = await axios.get(`${apiUrl}/api/v1/projects/${project.id}/time-records`, {
          headers: { 'X-Angie-AuthApiToken': apiToken }
        });

        let unbilled = 0;
        let billed = 0;

        // ActiveCollab returns an object with time records, not an array
        const timeRecords = Array.isArray(timeResponse.data)
          ? timeResponse.data
          : (timeResponse.data.time_records || []);

        if (timeRecords.length > 0) {
          timeRecords.forEach(record => {
            const hours = parseFloat(record.value || 0);
            if (record.billable_status === 1) { // 1 = billable
              if (record.is_billed) {
                billed += hours;
              } else {
                unbilled += hours;
              }
            }
          });

          if (unbilled > 0 || billed > 0) {
            projectStats.push({
              name: project.name,
              unbilled: unbilled,
              billed: billed
            });
            totalUnbilled += unbilled;
            totalBilled += billed;
          }
        }
      } catch (error) {
        // Skip projects with no time records or API errors
        if (error.response && error.response.status !== 404) {
          console.error(`Error fetching time for ${project.name}:`, error.message);
        }
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    UNBILLED HOURS BY CLIENT                   ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Sort by unbilled hours (highest first)
    projectStats.sort((a, b) => b.unbilled - a.unbilled);

    projectStats.forEach(stat => {
      if (stat.unbilled > 0) {
        console.log(`📁 ${stat.name}`);
        console.log(`   💰 Unbilled: ${stat.unbilled.toFixed(2)}h`);
        console.log(`   ✅ Billed:   ${stat.billed.toFixed(2)}h`);
        console.log('');
      }
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`💰 TOTAL UNBILLED: ${totalUnbilled.toFixed(2)} hours`);
    console.log(`✅ TOTAL BILLED:   ${totalBilled.toFixed(2)} hours`);
    console.log(`📊 GRAND TOTAL:    ${(totalUnbilled + totalBilled).toFixed(2)} hours`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Show summary
    const projectsWithUnbilled = projectStats.filter(s => s.unbilled > 0);
    console.log(`\n${projectsWithUnbilled.length} clients have unbilled hours`);

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

getUnbilledHours();
