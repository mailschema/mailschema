const version = '0.3';

// The site's current draft. Published artifact and contract URLs remain versioned.
export const specification = {
  version,
  status: 'Working draft',
  badge: 'Draft',
  source: `specifications/map-${version}`,
  profile: `https://mailschema.org/profiles/map/${version}`,
  artifacts: `/artifacts/map-${version}`,
  catalog: `/registry/map-${version}.json`,
} as const;
