

import { MASTER_PLAYER_LIST_RAW, BYE_WEEKS_RAW } from './playerDataContent';

// This map normalizes player names to a master record.
// Key: lowercase player name. Value: { name, position, team }
const playerNormalizationMap = new Map<string, { name: string; position: string; team: string }>();
// This map helps find players by last name + position for fuzzy matching.
// Key: `lastname|position`. Value: { name, position, team }
const playerLastNameMap = new Map<string, { name: string; position: string; team: string }>();
// This map stores bye weeks for each team.
// Key: team abbreviation (e.g., 'SF'). Value: bye week number.
export const teamByeWeekMap = new Map<string, number>();

/**
 * Extracts the last name from a full name string for fuzzy matching.
 * @param name The player's full name.
 * @returns The player's last name in lowercase.
 */
const getPlayerLastName = (name: string): string => {
    const parts = name.split(' ').filter(p => p && !p.endsWith('.') && p.length > 1);
    return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Parses the raw data strings to populate the data maps.
 * This function should only run once.
 */
const initializeData = () => {
    if (playerNormalizationMap.size > 0) return; // Already initialized

    const masterLines = MASTER_PLAYER_LIST_RAW.split('\n');
    masterLines.slice(1).forEach(line => {
        const [name, position, team] = line.split(',');
        if (name && position && team) {
            const player = { name: name.trim(), position: position.trim(), team: team.trim() };
            playerNormalizationMap.set(player.name.toLowerCase(), player);
            const lastName = getPlayerLastName(player.name);
            const lastNameKey = `${lastName}|${player.position}`;
            if (!playerLastNameMap.has(lastNameKey)) {
                playerLastNameMap.set(lastNameKey, player);
            }
        }
    });
    
    // Parse bye weeks
    BYE_WEEKS_RAW.trim().split('\n').forEach(line => {
        const parts = line.match(/Week (\d+): (.+)/);
        if (parts) {
            const week = parseInt(parts[1], 10);
            const teams = parts[2].split(',').map(t => t.trim());
            
            teams.forEach(teamFullName => {
                // Find the DST entry for the team to get its abbreviation
                const teamLine = masterLines.find(l => l.startsWith(teamFullName) && l.includes(',DST,'));
                if (teamLine) {
                    const teamAbbr = teamLine.split(',')[2];
                    if (teamAbbr) {
                        teamByeWeekMap.set(teamAbbr.trim(), week);
                    }
                }
            });
        }
    });
};

// Immediately initialize the data when the module is loaded.
initializeData();

/**
 * Finds a player's master record from the data.
 * It first tries an exact match on the name, then a fuzzy match on last name + position.
 * @param name The name of the player to find.
 * @param position The position of the player.
 * @returns The master player record or null if not found.
 */
export const getNormalizedPlayer = (name: string, position: string): { name: string; position: string; team: string } | null => {
    if (!name) return null;
    
    // 1. Try direct match (case-insensitive)
    let masterPlayer = playerNormalizationMap.get(name.toLowerCase());
    if (masterPlayer) return masterPlayer;

    // 2. Try fuzzy match on last name + position
    const lastName = getPlayerLastName(name);
    if (!lastName) return null;
    
    const lastNameKey = `${lastName}|${position}`;
    masterPlayer = playerLastNameMap.get(lastNameKey);
    return masterPlayer || null;
}
