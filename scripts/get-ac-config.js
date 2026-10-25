#!/usr/bin/env node

const axios = require('axios');
const config = require('../config');

async function getActiveCollabConfig() {
  const apiUrl = config.activeCollab.apiUrl;
  const apiToken = config.activeCollab.apiToken;

  console.log('=== ActiveCollab Configuration ===\n');

  // Get current user info
  console.log('Fetching current user info...');
  try {
    const userResponse = await axios.get(`${apiUrl}/api/v1/users/me`, {
      headers: {
        'X-Angie-AuthApiToken': apiToken
      }
    });

    const user = userResponse.data.single;
    console.log('\n✓ Current User:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.first_name} ${user.last_name}`);
    console.log(`  Email: ${user.email}`);
  } catch (err) {
    console.error('\n✗ Failed to fetch user info:', err.response?.data || err.message);
  }

  // Get job types
  console.log('\n\nFetching job types...');
  try {
    const jobTypesResponse = await axios.get(`${apiUrl}/api/v1/job-types`, {
      headers: {
        'X-Angie-AuthApiToken': apiToken
      }
    });

    const jobTypes = jobTypesResponse.data;
    console.log('\n✓ Available Job Types:');
    jobTypes.forEach(jt => {
      console.log(`  ID: ${jt.id} - ${jt.name} (${jt.default_hourly_rate ? '$' + jt.default_hourly_rate + '/hr' : 'No rate'})`);
    });
  } catch (err) {
    console.error('\n✗ Failed to fetch job types:', err.response?.data || err.message);
  }

  console.log('\n\n=== Configuration Instructions ===');
  console.log('Add these to your .env file:\n');
  console.log('# ActiveCollab Time Tracking');
  console.log('AC_USER_ID=<your_user_id_from_above>');
  console.log('AC_JOB_TYPE_ID=<job_type_id_for_development_work>');
  console.log('AC_BILLABLE_BY_DEFAULT=true');
}

getActiveCollabConfig().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
