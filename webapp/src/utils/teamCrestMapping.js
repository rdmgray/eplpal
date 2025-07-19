// Team crest mapping utility
export const getTeamCrest = (teamName) => {
  if (!teamName) return null;
  
  // Normalize team name to match our file naming convention
  const normalizedName = teamName.toLowerCase()
    .replace(/\s+fc$/, '')  // Remove FC suffix
    .replace(/\s*&\s*/g, '-')  // Replace " & " with single hyphen
    .replace(/\s+/g, '-')   // Replace spaces with hyphens
    .replace(/'/g, '')      // Remove apostrophes
    .replace(/-+/g, '-')    // Replace multiple hyphens with single hyphen
    .trim();
  
  // Team name mappings to handle variations
  const teamMappings = {
    'arsenal': 'arsenal',
    'aston-villa': 'aston-villa',
    'afc-bournemouth': 'bournemouth',
    'bournemouth': 'bournemouth',
    'brentford': 'brentford',
    'brighton-hove-albion': 'brighton',
    'brighton': 'brighton',
    'burnley': 'burnley',
    'chelsea': 'chelsea',
    'crystal-palace': 'crystal-palace',
    'everton': 'everton',
    'fulham': 'fulham',
    'ipswich-town': 'ipswich',
    'ipswich': 'ipswich',
    'leicester-city': 'leicester',
    'leicester': 'leicester',
    'liverpool': 'liverpool',
    'manchester-city': 'manchester-city',
    'manchester-united': 'manchester-united',
    'newcastle-united': 'newcastle',
    'newcastle': 'newcastle',
    'nottingham-forest': 'nottingham-forest',
    'southampton': 'southampton',
    'tottenham-hotspur': 'tottenham',
    'tottenham': 'tottenham',
    'west-ham-united': 'west-ham',
    'west-ham': 'west-ham',
    'wolverhampton-wanderers': 'wolverhampton',
    'wolverhampton': 'wolverhampton',
    'wolves': 'wolverhampton',
    'leeds-united': 'leeds',
    'leeds': 'leeds',
    'sunderland': 'sunderland',
    'sunderland-afc': 'sunderland'
  };
  
  // Get the mapped filename
  const crestFile = teamMappings[normalizedName];
  
  if (crestFile) {
    return `/images/crests/${crestFile}.svg`;
  }
  
  // Fallback - try direct mapping
  return `/images/crests/${normalizedName}.svg`;
};

// Helper function to check if a crest exists
export const hasCrest = (teamName) => {
  return getTeamCrest(teamName) !== null;
};