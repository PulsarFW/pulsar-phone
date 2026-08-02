export interface CurrentSong {
	id: number;
	label_name: string;
	title: string;
	isPlaying: boolean;
	duration: number;
}

export const musicState = $state({
	currentSong: null as CurrentSong | null,
});

export function handleMusicMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'MUSIC_PROGRESS': {
			const music = data.music as CurrentSong | undefined;
			musicState.currentSong = music ?? null;
			break;
		}
		case 'MUSIC_END':
			musicState.currentSong = null;
			break;
	}
}
