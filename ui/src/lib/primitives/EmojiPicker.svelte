<!-- small popup emoji grid, a curated common set (no dependency needed) -->
<script lang="ts">
	let { onPick }: { onPick: (emoji: string) => void } = $props();

	let open = $state(false);

	const EMOJI = [
		'😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
		'😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
		'😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
		'🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
		'😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
		'🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
		'😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
		'😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
		'😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀',
		'👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟',
		'🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊',
		'👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏', '💪', '🤝',
		'💅', '🤳', '👀', '🧠', '🦷',
		'❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
		'❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯', '💢',
		'💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️',
		'💭', '🔥', '✨', '🎉', '🎊', '⭐', '🌟', '⚡', '☀️', '🌙',
		'🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
		'🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
		'🐦', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
		'🦋', '🐌', '🐞', '🐜', '🕷️', '🦂', '🐢', '🐍', '🦖', '🐙',
		'🦈', '🐬', '🐳', '🐊', '🐆', '🦓', '🦍', '🐘', '🦛', '🐄',
		'🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑',
		'🥭', '🍍', '🥝', '🍅', '🥑', '🍆', '🥔', '🌽', '🌶️', '🥕',
		'🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🍿', '🥓',
		'🍳', '🥞', '🧇', '🍗', '🍖', '🥩', '🍤', '🍣', '🍱', '🍜',
		'🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '☕', '🍵',
		'🧃', '🥤', '🍺', '🍻', '🍷', '🥂', '🍸', '🍹', '🥃', '🍾',
		'⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
		'🥊', '🎮', '🎲', '🎯', '🎳', '🎣', '🎽', '🏆', '🥇', '🎸',
		'🎧', '🎤', '🎬', '📷', '🎨', '🚗', '🚕', '🚓', '🚔', '🚑',
		'🚒', '🚚', '🏍️', '🚲', '✈️', '🚁', '🚀', '🛸', '⛵', '🚢',
		'📱', '💻', '⌨️', '🖥️', '🖨️', '💾', '💿', '📀', '🎥', '📺',
		'📻', '☎️', '📞', '📟', '📠', '🔋', '🔌', '💡', '🔦', '🕯️',
		'💵', '💰', '💳', '💎', '🔫', '💊', '💉', '🚬', '⚰️', '🔨',
		'🪓', '🔧', '🔩', '⚙️', '🔒', '🔓', '🔑', '🗝️', '🚪', '🪞',
		'✅', '❌', '⭕', '❓', '❗', '⚠️', '🚫', '♻️', '🏳️', '🎌',
	];

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		open = !open;
	}

	function pick(emoji: string) {
		onPick(emoji);
		open = false;
	}
</script>

<svelte:window onclick={() => (open = false)} />

<div class="emoji-wrap">
	<button class="emoji-btn" onclick={toggle} aria-label="Emoji">😀</button>
	{#if open}
		<div class="emoji-panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (open = false)} role="menu" tabindex="-1">
			{#each EMOJI as emoji, i (i)}
				<button class="emoji-cell" onclick={() => pick(emoji)}>{emoji}</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.emoji-wrap {
		position: relative;
		display: inline-flex;
	}

	.emoji-btn {
		background: none;
		border: none;
		font-size: 18px;
		cursor: pointer;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.emoji-panel {
		position: absolute;
		bottom: calc(100% + 6px);
		left: -6px;
		width: 220px;
		max-height: 180px;
		overflow-y: auto;
		background: var(--color-bg-panel);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-panel);
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		padding: 8px;
		z-index: 200;
	}

	.emoji-cell {
		background: none;
		border: none;
		font-size: 18px;
		padding: 6px 0;
		cursor: pointer;
		border-radius: var(--radius);
	}

	.emoji-cell:hover {
		background: rgba(255, 255, 255, 0.08);
	}
</style>
