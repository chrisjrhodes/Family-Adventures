export async function loadAppData(config) {
  const holidayId = config.activeHoliday || "center-parcs-2026";

  const [profilesResponse, holidayResponse] = await Promise.all([
    fetch("./data/profiles.json"),
    fetch(`./data/holidays/${holidayId}.json`)
  ]);

  if (!profilesResponse.ok) {
    throw new Error("Could not load profiles.json");
  }

  if (!holidayResponse.ok) {
    throw new Error(`Could not load holiday configuration: ${holidayId}`);
  }

  const [profiles, holiday] = await Promise.all([
    profilesResponse.json(),
    holidayResponse.json()
  ]);

  return { profiles, holiday };
}
