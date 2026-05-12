import { monogatari } from './engine.js';
import { fetchSessionMe } from './api.js';
import { hasLocalAutoSave } from './save.js';
import { handleNewGame, handleResume, handleSomaQuit, handleDevStart } from './game-flow.js';

monogatari.registerListener ('soma-new', {
	callback: function () {
		console.debug ('[soma-new] click → handleNewGame()');
		handleNewGame ();
		return true;
	}
});
monogatari.registerListener ('soma-resume', {
	callback: function () {
		console.debug ('[soma-resume] click → handleResume()');
		handleResume ();
		return true;
	}
});
monogatari.registerListener ('soma-quit', {
	callback: function () {
		console.debug ('[soma-quit] click → handleSomaQuit()');
		handleSomaQuit ();
		return true;
	}
});

const MainMenu = monogatari.component ('main-menu');

class SomaMainMenu extends MainMenu {
	render () {
		return `
			<div data-ui="main-brand" aria-hidden="true">
				<span data-ui="main-kicker">SOMA x First Love</span>
                <strong data-ui="main-title">커널을 좋아하는<br>옆자리의 그녀</strong>
			</div>
			<div data-content="wrapper">
                <button type="button" data-action="soma-resume" data-soma-button="resume" hidden>이어 하기</button>
                <button type="button" data-action="soma-new"    data-soma-button="new">새 게임</button>
                <button type="button" data-action="open-screen" data-open="settings">설정</button>
                <button type="button" data-action="open-screen" data-open="help">도움말</button>
			</div>
		`;
	}

	async didMount () {
		console.debug ('[soma-menu] didMount — registering refresh');
		await this._refreshSomaMenu ();
	}

	async _refreshSomaMenu () {
		try {
			const [me, localHasSave] = await Promise.all ([fetchSessionMe (), hasLocalAutoSave ()]);
			const beReady   = !!(me?.has_session && me?.is_started !== false);
			const canResume = beReady || localHasSave;
			const resumeBtn = this.querySelector ('[data-soma-button="resume"]');
			const newBtn    = this.querySelector ('[data-soma-button="new"]');
			if (resumeBtn) resumeBtn.hidden = !canResume;
			if (newBtn)    newBtn.textContent = canResume ? '새 게임 (이전 진행 삭제)' : '새 게임';
		} catch (e) {}
	}
}
SomaMainMenu.tag = 'main-menu';
monogatari.registerComponent (SomaMainMenu);

const SettingsScreen = monogatari.component ('settings-screen');
class SomaSettingsScreen extends SettingsScreen {
	render () {
		const baseHtml = super.render ();
		const quitHtml = `
			<div class="row row--center padded settings-quit-row">
				<button type="button" data-action="soma-quit" class="settings-quit-btn">메인 메뉴로</button>
			</div>
		`;
		return baseHtml + quitHtml;
	}
}
SomaSettingsScreen.tag = 'settings-screen';
monogatari.registerComponent (SomaSettingsScreen);

// 개발용 단축키: 메인 화면에서 Ctrl+Shift+D → LLMChatInit 즉시 진입
document.addEventListener ('keydown', function (e) {
	if (!e.ctrlKey || !e.shiftKey || e.key !== 'D') return;
	if (document.body.classList.contains ('game-active')) return;
	e.preventDefault ();
	console.debug ('[dev-key] Ctrl+Shift+D → handleDevStart()');
	handleDevStart ();
});

// 인게임 확인용 단축키: Ctrl+Y → 현재 호감도에 맞는 엔딩으로 즉시 점프
document.addEventListener ('keydown', function (e) {
	if (!e.ctrlKey || e.shiftKey || e.altKey || (e.key !== 'y' && e.key !== 'Y')) return;
	if (!document.body.classList.contains ('game-active')) return;
	e.preventDefault ();
	const game = monogatari.storage ('game') || {};
	const aff = typeof game.affinity === 'number' ? game.affinity : 0;
	let sceneId;
	if      (aff <= -100) sceneId = 'SCENE_ENDING_INSTANT_BAD';
	else if (aff <= -30)  sceneId = 'SCENE_ENDING_BAD';
	else if (aff <= 0)    sceneId = 'SCENE_ENDING_NORMAL_NO_CONTACT';
	else if (aff <= 29)   sceneId = 'SCENE_ENDING_NORMAL_CONTACT';
	else if (aff <= 99)   sceneId = 'SCENE_ENDING_HAPPY';
	else                  sceneId = 'SCENE_ENDING_MARRIAGE';
	console.debug ('[dev-key] Ctrl+Y → ' + sceneId + ' (affinity=' + aff + ')');
	monogatari.storage ({ game: Object.assign ({}, game, { current_scene_id: sceneId }) });
	monogatari.state ({ label: 'Ending', step: -1 });
	try { monogatari.proceed ({ userInitiated: false, skip: false, autoPlay: false }); }
	catch (err) { console.warn ('[dev-key] proceed 실패:', err); }
});

export function refreshSomaMainMenu () {
	document.querySelectorAll ('main-menu').forEach (el => {
		if (typeof el._refreshSomaMenu === 'function') el._refreshSomaMenu ();
	});
}
