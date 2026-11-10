/* Moment_Motion Kit panel — 화면 동작 + 프리미어(host.jsx) 호출 */
(function () {
  'use strict';
  var MK = window.MK;
  var cep = window.__adobe_cep__;
  var FORCE_MINI = !!window.MK_FORCE_MINI;          // mini.html (별도 미니 패널)
  var MAIN_ID = 'com.moment.motionkit.main';
  var RUN = window.MK_RUNNING || { v: '1.7.1', src: 'bundled' };
  var VERSION = 'v' + RUN.v;
  var SRCNAME = { online: '방금 자동 업데이트됨', cache: '저장된 업데이트', bundled: '설치본' };


  /* ---------- 언어 (한국어 / English) ----------
   * 화면 글자는 한국어로 만들고, English 를 고르면 글자 노드를 아래 사전으로 바꿔 보여준다.
   * 프리셋 이름/설명은 engine.js 의 MK.EN 표를 쓴다.
   */
  var LANG = 'ko';
  var KO_EN = {
    '모션': 'Motion', '커브': 'Curve', '효과': 'Effects', '시퀀스 없음': 'No sequence',
    '설정 ▴': 'Settings ▴', '설정 ▾': 'Settings ▾', '설정 펼치기': 'Unfold settings', '설정 접기 (효과 목록을 넓게)': 'Fold settings (more room for effects)',
    '설정 접기/펼치기': 'Fold/unfold settings', '눌러서 설정 펼치기': 'Click to unfold settings',
    '⌫ 선택 클립의 모션 효과 지우기': '⌫ Clear motion effects on selected clips', '선택 클립의 모션 효과 지우기': 'Clear motion effects on selected clips',
    '효과 지우기': 'Clear effects', '선택 클립에 MotionKit 이 넣은 효과를 지워요': 'Removes the effects MotionKit added to the selected clips',
    '강도': 'Strength', '속도': 'Speed', '길이': 'Length', '시작': 'Start', '재생헤드': 'Playhead', '클립 시작': 'Clip start', '등장': 'Entry',
    '기본': 'Normal', '밖에서 꽂기': 'From outside', '프레임 밖에서 팍 꽂기': 'Slam in from outside the frame', '기준점': 'Pivot',
    '화면에서 지정': 'Pick on screen', '지금 화면을 캡처해서 기준점을 직접 찍어요': 'Capture the current frame and pick the pivot',
    '블러': 'Blur', '자동 모션블러': 'Auto motion blur', '빠른 움직임에 자동으로 모션블러': 'Automatic motion blur on fast moves', '모션블러': 'Motion blur',
    '천천히 줌': 'Slow zoom', '느림': 'Slow', '빠름': 'Fast', '클립에 맞춤': 'Fit clip', '자동': 'Auto', '켬': 'on', '끔': 'off', '▾ 설정': '▾ Settings',
    '자동: 프리셋 기본 길이 × 속도': 'Auto: preset length × speed', '직접 입력도 돼요 (초)': 'You can type a value (sec)',
    '길이 자동 (프리셋 기본 × 속도)': 'Length auto (preset × speed)', ' 로 지정': ' set',
    '💡 즐겨찾기 사용법': '💡 Favorites', '카드의 ☆ 를 누르거나, 변형 버튼을': 'Click ☆ on a card, or', '우클릭': 'right-click',
    '하면 즐겨찾기에 들어가요.': ' a variant button, to add it to favorites.', '(작게 접기)나': '(collapse) or the ', 'Mini 패널': 'Mini panel',
    '에서 즐겨찾기만 바로 쓸 수 있어요.': ' show just your favorites.', '미니 창에서 버튼을': 'In the mini window,', '끌어서': 'drag',
    '순서를 바꿀 수 있어요.': ' buttons to reorder them.', '다시 보지 않기': "Don't show again",
    '타이핑 · 색 차오르기 설정': 'Typing · Color fill settings', '글자 영역': 'Text area', '자동 측정': 'Auto measure', '지금 측정': 'Measure now',
    '차오를 색': 'Fill color', '문장': 'Text', '글자당': 'Per char', '글자 폭': 'Text width', '중심': 'Center', '영역 보기': 'Show area',
    '영역 보기 끄기': 'Hide area', '모니터에서 범위 확인': 'Check the range on the monitor',
    '자막 글자가 화면 가로에서 차지하는 범위예요.': 'The horizontal range the caption text takes on screen.',
    '를 켜고 글자가 딱 들어오게 맞춘 뒤 타이핑을 누르세요.': ' on, fit the text inside it, then press Typing.',
    '비우면 자막 글자를 자동으로 읽어요': 'Leave empty to read the caption text automatically',
    '"복제용" 효과: 원본을 Alt+드래그로 복사한 뒤 복사본에 쓰세요 (색 차오르기·잔상 = 위 트랙, 뒤에서 빛 반짝 = 아래 트랙).':
      '"Duplicate" effects: Alt+drag the original to make a copy and apply to the copy (Color fill · ghosts = track above, Back glow = track below).',
    '진단 정보 복사 (잘 안 될 때)': 'Copy diagnostics (if something fails)', '닫기': 'Close',
    '우클릭: 내 커브 삭제': 'Right-click: delete my curve', '지금 커브를 이름 붙여 저장': 'Name and save the current curve', '저장': 'Save',
    '대상': 'Target', '위치': 'Position', '비율': 'Scale', '회전': 'Rotation', '불투명도': 'Opacity', '기타 효과': 'Other effects', '범위': 'Range',
    '모든 구간': 'All segments', '재생헤드 구간': 'Segment at playhead', '키 간격': 'Key step', '1프레임': '1 frame', '2f 빠름': '2f fast', '4f 보통': '4f normal', '6f 천천히': '6f slow', '2프레임': '2 frames',
    '선택 클립 키프레임에 커브 적용': 'Apply curve to selected clip keyframes', '원래 키프레임으로 복원': 'Restore original keyframes',
    '클립에 이미 있는 키프레임 사이를 이 커브 모양으로 채워요. 직접 찍은 키프레임에도 돼요. 커브를 바꿔서 다시 누르면 교체돼요.':
      'Fills the space between existing keyframes with this curve. Works on hand-made keyframes too. Change the curve and press again to replace it.',
    '선형': 'Linear', '부드럽게': 'Smooth', '감속': 'Ease out', '가속': 'Ease in', '강한 감속': 'Strong ease', '오버슈트': 'Overshoot',
    '즐겨찾는 효과': 'Favorite effects', '클릭: 선택 클립에 추가 · 우클릭: 빼기': 'Click: add to selected clips · Right-click: remove',
    '효과 찾기': 'Find effects', '효과 이름 검색 (한글/영문)': 'Search effects (Korean/English)', '비디오': 'Video', '오디오': 'Audio',
    '목록을 불러오는 중…': 'Loading list…', '이름을 누르면 선택한 클립에 바로 들어가요. ☆ 로 즐겨찾기하면 위와 미니 창에 나와요.':
      'Click a name to add it to the selected clips. Star it with ☆ to show it above and in the mini window.',
    '오디오 효과(리버브 등)는 타임라인에서': 'For audio effects (reverb etc.), select an', '오디오 클립': 'audio clip', '을 선택하고 누르세요.': ' in the timeline first.',
    '아래 목록에서 ☆ 를 눌러 추가하세요': 'Press ☆ in the list below to add', '클릭: 추가 / 우클릭: 즐겨찾기 빼기': 'Click: add / Right-click: remove favorite',
    '찾는 효과가 없어요': 'No matching effects', '타임라인에서 오디오 클립을 먼저 선택하세요': 'Select an audio clip in the timeline first',
    '선택한 오디오 클립에 추가': 'Add to selected audio clips', '선택한 클립에 추가': 'Add to selected clips',
    '기준점 바꾸기': 'Change pivot', '▶ 미리보기': '▶ Preview', '가운데로': 'Center', '완료': 'Done', '이 점을 중심으로 줌되는 모습 다시 보기': 'Replay the zoom around this point',
    '점을 드래그하거나 클릭하세요 · 놓으면 그 점을 중심으로 줌되는 모습을 미리 보여줘요 · 선택한 클립에 이미 넣은 모션도 바로 바뀌어요':
      'Drag or click the point · on release, a zoom around it is previewed · motion already on the selected clip updates too',
    '클립을 선택하고 모션을 누르세요': 'Select a clip and press a motion', '패널 새로고침 (engine.js 등을 고친 뒤)': 'Reload panel',
    '작게 접기 (즐겨찾기만 보기)': 'Collapse (favorites only)', '전체 패널 열기': 'Open full panel', '크게 펼치기': 'Expand',
    '창 > 확장 프로그램 > Moment_Motion Kit 을 여세요': 'Open Window > Extensions > Moment_Motion Kit', '패널 창을 조금 더 크게 늘리면 펼쳐져요': 'Make the panel a bit bigger to expand it',
    '왼쪽 위': 'Top left', '위': 'Top', '오른쪽 위': 'Top right', '왼쪽': 'Left', '가운데': 'Center', '오른쪽': 'Right', '왼쪽 아래': 'Bottom left', '아래': 'Bottom', '오른쪽 아래': 'Bottom right',
    '노랑': 'Yellow', '빨강': 'Red', '하늘': 'Sky', '핑크': 'Pink', '초록': 'Green', '흰색': 'White', '검정': 'Black',
    '전체': 'All', '즐겨찾기': 'Favorites', '끝까지': 'to end', '즉시': 'instant', '효과 검색': 'Search effects', '효과 이름 검색': 'Search effects',
    '방금 자동 업데이트됨': 'just auto-updated', '저장된 업데이트': 'saved update', '설치본': 'installed',
    '시퀀스를 먼저 열어주세요': 'Open a sequence first', '변형(Transform) 효과를 추가하지 못했어요': "Couldn't add the Transform effect",
    '효과를 추가할 수 없어요 (QE 사용 불가)': "Can't add effects (QE unavailable)", '프리미어 프로 안에서 열어주세요': 'Open this inside Premiere Pro',
    '프리미어 응답을 읽지 못했어요': "Couldn't read Premiere's response", '아래 트랙에 원본 자막이 없어요': 'No original caption on the track below',
    'VR 색수차': 'VR Chromatic Aberrations', '시간 포스터화': 'Posterize Time', '색조': 'Tint', '밝기 및 대비': 'Brightness & Contrast', '자르기': 'Crop',
    '가우시안 흐림': 'Gaussian Blur', '난류 변위': 'Turbulent Displace', '방향 흐림': 'Directional Blur', '파도 비틀기': 'Wave Warp', '선형 닦아내기': 'Linear Wipe',
    '경사(Ramp)': 'Ramp', '트랙 매트 키': 'Track Matte Key', '모션의 기본 자르기 사용': "used Motion's built-in crop", '자르기 대신 선형 닦아내기 사용': 'used Linear Wipe instead of Crop',
    '자막을 Alt 를 누른 채 바로 위 트랙으로 끌어서 같은 위치에 복제 → 위쪽 복제본을 선택하고 다시 누르세요':
      'Alt-drag the caption straight up onto the track above to duplicate it in place → select the upper copy and press again',
    '오류: ': 'Error: ', '직접 입력한 문장': 'typed text', '자막 글자 읽음': 'read from caption', '클립 이름 사용': 'clip name', '자막 글자를 못 읽음': "couldn't read caption",
    '자동: 자막 글자 → 클립 이름 순으로 읽음': 'Auto: caption text, then clip name', '자막 클립을 먼저 선택하세요': 'Select a caption clip first',
    '자르기 효과를 쓸 수 없어서 영역 보기가 안 돼요 → 아래 "진단 정보 복사"를 눌러 알려주세요': 'Crop is not available, so the area view cannot be shown → press "Copy diagnostics" below and send it',
    '영역 보기를 껐어요': 'Area view off', '화면 캡처를 못 해서 빈 화면이에요': 'Screen capture failed — blank frame', '화면을 캡처하는 중…': 'Capturing the screen…',
    '점을 드래그하거나 클릭하세요 · 놓으면 그 점을 중심으로 줌되는 모습을 보여줘요': 'Drag or click the point · release to preview a zoom around it',
    '화면 캡처가 안 돼서 빈 화면에 표시했어요 · 점은 그대로 옮길 수 있어요 (진단 정보 복사로 알려주세요)': "Couldn't capture the screen, so a blank frame is shown · you can still move the point (send Copy diagnostics)",
    '못 찾음': 'not found', '글자 영역을 재는 중…': 'Measuring text area…',
    '글자 영역을 못 찾았어요 (어두운 글자거나 캡처 불가) → 글자 폭/중심을 직접 맞춰주세요': "Couldn't find the text area (dark text or no capture) → set width/center by hand",
    '어떤 영상에나 쓰기 좋은 기본 모션': 'Basic moves that fit any footage', '타격감 · 짧고 센 한 방': 'Punchy · short and strong', '자막에 잘 어울리는 움직임': 'Moves that suit captions',
    '타이핑 · 블러 · 와이프 같은 모션자막': 'Motion captions: typing, blur, wipes', '상황 · 감정 연출': 'Situations · emotions',
    '☆ 를 누르거나 변형 버튼을 우클릭해서 즐겨찾기를 추가하세요': 'Press ☆ or right-click a variant button to add favorites',
    '즐겨찾기가 없어요. 전체 패널에서 ☆ 를 눌러 추가하세요.': 'No favorites yet. Press ☆ in the full panel to add some.',
    '✓ 순서를 바꿨어요': '✓ Order changed', '적용 중…': 'Applying…', '타임라인에서 클립을 먼저 선택하세요': 'Select a clip in the timeline first',
    '진단 중…': 'Running diagnostics…', '✓ 진단 정보를 복사했어요. 채팅에 붙여넣어 주세요': '✓ Diagnostics copied. Paste them in the chat',
    '아래 내용을 전체 선택(Ctrl+A) 후 복사해 주세요': 'Select all (Ctrl+A) below and copy it', '선택한 클립에 지울 모션 효과가 없어요': 'No motion effects to clear on the selected clips',
    '✓ 변형 효과 값을 초기화했어요': '✓ Transform values reset', '커브 이름을 입력하세요': 'Enter a curve name',
    '재생헤드가 키프레임 두 개 사이에 있어야 해요': 'The playhead must be between two keyframes', '선택한 대상에 키프레임이 2개 이상인 속성이 없어요': 'No selected property has 2 or more keyframes',
    '커브 적용 중…': 'Applying curve…', '복원할 기록이 없어요 (패널을 다시 열면 기록이 사라져요)': 'Nothing to restore (history is cleared when the panel reopens)',
    '미리보기 모드 — 프리미어 안에서 열면 적용돼요': 'Preview mode — open inside Premiere to apply',
    '지우기': 'Clear', '검색': 'Search', '찾는 모션이 없어요': 'No matching motions', '모션 검색': 'Search', '모션 이름 검색 (한글/영문)': 'Search motions (Korean/English)',
    /* 트래킹 탭 */
    '트래킹': 'Tracking',
    '방식': 'Mode',
    '따라가기': 'Follow',
    '고정': 'Stabilize', '흔들리는 대상을 화면에 고정 (안정화)': 'Lock a moving subject in place (stabilize)', '추적하는 중… 끝나면 선택한 클립에 바로 들어가요': 'Tracking… it is applied to the selected clip when done',
    '화면 합성': 'Screen insert',
    '클립 전체': 'Whole clip',
    '인·아웃 구간': 'In–Out range',
    '시퀀스에 인·아웃을 찍어 둔 구간만 추적': 'Track only between the sequence In and Out points',
    '간격': 'Every',
    '매 프레임': '1 frame',
    '3프레임': '3 frames',
    '2프레임마다 추적 (더 빠름)': 'Track every 2nd frame (faster)',
    '3프레임마다 추적 (가장 빠름)': 'Track every 3rd frame (fastest)',
    '① 화면 가져와서 추적하기': '① Grab frame & track',
    '추적 결과': 'Track result',
    '아직 없음': 'None yet',
    '속성': 'Properties',
    '추적 모션블러': 'Tracking motion blur',
    '확대': 'Zoom',
    '② 선택 클립에 다시 적용': '② Re-apply to selected clips',
    '추적 키프레임 지우기': 'Clear tracking keyframes',
    '선택 클립의 추적 키프레임(모션 위치·비율·회전, 모퉁이 고정)을 지워요': 'Removes tracking keyframes (Motion position/scale/rotation, Corner Pin) from the selected clips',
    '추적이 끝나면 선택했던 클립에 바로 들어가요. 속성·부드럽게를 바꾼 뒤 \"다시 적용\"을 누르면 다시 추적하지 않고 값만 바뀌어요. 같은 추적을 다른 클립에 넣을 때도 그 클립을 선택하고 \"다시 적용\".': 'When tracking finishes it is applied to the clip you selected. Change Properties/Smooth and press "Re-apply" to update without tracking again. To put the same track on another clip, select it and press "Re-apply".',
    '무늬가 뚜렷한 곳(얼굴, 로고, 글자, 모서리)을 지정할수록 잘 따라가요. 추적하는 동안 재생헤드가 움직이고 위쪽 트랙이 잠깐 꺼졌다가 끝나면 원래대로 돌아와요.': 'Areas with clear detail (faces, logos, text, corners) track best. While tracking, the playhead moves and upper tracks are hidden briefly, then everything is restored.',
    '붙일 클립(자막·이미지·영상)을 선택 → 화면에서 따라갈 대상을 네모로 지정하면, 선택한 클립이 그 대상을 따라 움직여요.': 'Select the clip to attach (title, image, video) → box the subject on screen, and the selected clip follows it.',
    '흔들리는 영상 클립을 선택 → 멈춰 보이게 할 대상을 네모로 지정하면, 그 대상이 제자리에 있도록 영상을 반대로 움직여요.': 'Select the shaky video clip → box the subject to lock, and the clip is moved the opposite way so the subject stays put.',
    '끼워 넣을 클립(위 트랙의 영상·이미지)을 선택 → 아래 화면의 모니터·휴대폰 네 모서리를 지정하면, 선택한 클립이 그 화면에 붙어요.': 'Select the clip to insert (video/image on an upper track) → mark the four corners of the monitor or phone below, and the clip is pinned to that screen.',
    '따라갈 대상 지정': 'Pick the subject to follow',
    '고정할 대상 지정': 'Pick the subject to lock',
    '화면의 네 모서리 지정': 'Mark the four screen corners',
    '점 1~4 를 끌어서 화면의 왼쪽 위 → 오른쪽 위 → 오른쪽 아래 → 왼쪽 아래 모서리에 맞추세요': 'Drag points 1–4 to the top-left → top-right → bottom-right → bottom-left corners of the screen',
    '따라갈 대상 위에서 끌어서 네모를 그리세요 · 무늬가 뚜렷한 곳일수록 잘 따라가요': 'Drag a box over the subject · clear detail tracks best',
    '추적 시작': 'Start tracking',
    '중지': 'Stop',
    '셔터 180°': 'Shutter 180°',
    '변형 효과에 기록 (셔터 180°)': 'Written to a Transform effect (shutter 180°)',
    '끔 · 클립의 모션 속성에 기록': 'Off · written to the clip Motion',
    '영역을 다시 끌면 새로 지정돼요': 'Drag again to redraw the box',
    '대상 위에서 끌어서 네모를 그리세요': 'Drag a box over the subject',
    '추적 엔진을 불러오지 못했어요 — 패널을 새로고침(↻)해 주세요': 'Tracking engine not loaded — reload the panel (↻)',
    '고정할 영상 클립을 먼저 선택하세요': 'Select the video clip to stabilize first',
    '붙일 클립을 먼저 선택하세요': 'Select the clip to attach first',
    '클립이 너무 짧아요': 'The clip is too short',
    '이 영역은 무늬가 부족해서 따라가기 어려워요 → 모서리·글자·얼굴처럼 뚜렷한 곳을 포함해 다시 지정하세요': 'Not enough detail here to track → include clear detail such as corners, text or a face',
    '중지했어요': 'Stopped',
    '대상을 따라가지 못했어요 → 영역을 조금 넓혀서 다시 지정해 보세요': 'Lost the subject → try a slightly larger area',
    '먼저 \"① 화면 가져와서 추적하기\"로 추적해 주세요': 'Track first with "① Grab frame & track"',
    '적용할 클립을 먼저 선택하세요': 'Select a clip to apply to first',
    '속성(위치·비율·회전)을 하나 이상 켜 주세요': 'Turn on at least one property (position, scale, rotation)',
    '선택한 클립이 추적한 구간과 겹치지 않아요': 'The selected clip does not overlap the tracked range',
    '키프레임을 넣는 중…': 'Writing keyframes…',
    '클립을 먼저 선택하세요': 'Select a clip first',
    '이 프리미어에서는 화면 캡처를 쓸 수 없어요': 'Frame capture is not available in this Premiere',
    '화면을 캡처하지 못했어요': 'Could not capture the frame',
    '캡처한 화면을 불러오지 못했어요': 'Could not load the captured frame',
    '캡처한 화면을 읽지 못했어요': 'Could not read the captured frame',
    '모션 속성을 찾지 못했어요': 'Motion properties not found',
    '모퉁이 고정(Corner Pin) 효과를 추가하지 못했어요': 'Could not add the Corner Pin effect',
    '변형(Transform) 효과의 속성이 예상과 달라요': 'Unexpected Transform effect properties',
    '속성을 찾지 못했어요': 'Property not found',
    '클립을 찾지 못했어요': 'Clip not found',
    "⇄ 뒤집기": "⇄ Reverse",
    "All 전체": "All",
    "골라서": "Pick",
    "Linear (원래대로)": "Linear (reset)",
    "곡선 적용": "Apply curve",
    "곡선": "Curves",
    "모션블러": "Motion blur",
    "마우스를 올리면 미리보기 · 우클릭: 내 곡선 삭제": "Hover to preview · right-click: delete my curve",
    "클립에 이미 있는 키프레임 사이를 이 곡선 모양으로 채워요. 직접 찍은 키프레임에도 돼요. 곡선을 바꿔서 다시 누르면 교체되고,": "Fills the gaps between the keyframes already on the clip with this curve shape — works on keyframes you set yourself too. Pick another curve and press again to replace it;",
    "로 원래대로 돌아가요.": "returns to the original.",
    "를 고르면 원하는 속성·구간만 바꿀 수 있어요.": "lets you change only the properties and segments you want.",
    "빠르게 넣기": "Quick insert",
    "선택한 클립 길이에 맞춰 위쪽 빈 트랙에 · 선택이 없으면 재생헤드부터 5초": "Matches the selected clips on a free track above · no selection: 5s from the playhead",
    '선택 클립 길이에 맞춰 · 없으면 재생헤드부터 5초': 'Fits selected clips · else 5s from playhead',
    '선택한 클립 길이에 맞춰, 다른 클립과 겹치지 않게 위쪽 빈 트랙에 넣어요 (빈 트랙이 없으면 트랙을 추가) · 선택이 없으면 재생헤드부터 5초': 'Inserted on a free track above, matching the selected clips without overlapping others (adds a track if needed) · no selection: 5s from the playhead',
    '조정 레이어': 'Adjustment layer', '검은 화면': 'Black screen', '＋ 조정': '＋ Adj.', '＋ 검정': '＋ Black',
    '아래 목록이나 위 빠르게 넣기의 ☆ 를 눌러 추가하세요': 'Press ☆ in the list below or on the quick-insert buttons above to add',
    "＋ 조정 레이어": "＋ Adjustment layer",
    "＋ 검은 화면": "＋ Black screen",
    "속성과 구간 고르기": "Pick properties and segments",
    "곡선을 넣을 키프레임 사이를 눌러서 고르세요": "Click the keyframe segments to curve",
    "모두": "All",
    "없음": "None",
    "취소": "Cancel",
    "적용": "Apply",
    "재생헤드 구간": "At playhead",
    "곡선의 앞뒤를 뒤집어요 (멈추는 곡선 ↔ 출발하는 곡선)": "Reverse the curve (ease-out ↔ ease-in)",
    "선택한 클립의 키프레임 있는 속성 전체에": "All keyframed properties of the selected clips",
    "속성과 키프레임 구간을 골라서": "Choose properties and keyframe segments",
    "모션(Motion)으로 움직인 클립을 변형(Transform) 효과로 옮기고 모션블러(셔터 180°)를 켜요": "Moves Motion animation to a Transform effect and turns on motion blur (shutter 180°)",
    "곡선을 빼고 원래 키프레임(일정한 속도)으로 되돌려요": "Remove the curve and go back to the original (constant speed) keyframes",
    "일정한 속도": "Constant speed",
    "빠르게 출발해 부드럽게 멈춤": "Fast start, smooth stop",
    "빠르게 출발해 튕기듯 멈춤": "Fast start, springy stop",
    "천천히 출발 → 빨라졌다 → 부드럽게 멈춤": "Slow start → faster → smooth stop",
    "천천히 출발해 점점 빨라짐": "Slow start, speeds up",
    "양쪽 다 부드럽게": "Smooth on both ends",
    "확 나갔다가 길게 멈춤": "Shoots out, long settle",
    "살짝 지나쳤다 돌아옴": "Overshoots a little and comes back",
    "고무줄처럼 여러 번 출렁이며 멈춤": "Wobbles like a rubber band before stopping",
    "바닥에 튕기듯 통통 멈춤": "Bounces to a stop",
    "지금 곡선을 이름 붙여 저장": "Name and save the current curve",
    "이 곡선은 모양이 정해져 있어요 → 손잡이로 바꾸려면 다른 곡선을 먼저 고르세요": "This curve has a fixed shape → pick another curve to edit with handles",
    "곡선 이름을 입력하세요": "Enter a curve name",
    "내 곡선은 50개까지 저장할 수 있어요 → 안 쓰는 곡선을 우클릭해서 지워주세요": "You can save up to 50 curves → right-click unused ones to delete",
    "선택한 대상에 키프레임이 2개 이상인 속성이 없어요": "No selected property has 2 or more keyframes",
    "곡선 적용 중…": "Applying curve…",
    "선택한 클립에 키프레임이 2개 이상인 속성이 없어요": "The selected clips have no property with 2 or more keyframes",
    "곡선을 넣을 구간을 고르고 적용을 누르세요": "Pick the segments to curve and press Apply",
    "구간을 하나 이상 고르세요": "Pick at least one segment",
    "타임라인에서 클립을 먼저 선택하세요": "Select a clip in the timeline first",
    "되돌릴 곡선 기록이 없어요 (패널을 다시 열면 기록이 사라져요)": "No curve history to undo (it is cleared when the panel reopens)",
    "검은 화면 그림을 만들지 못했어요": "Could not create the black image",
    "검은 화면 넣는 중…": "Inserting black screen…",
    "조정 레이어 넣는 중…": "Inserting adjustment layer…",
    "프로젝트에 조정 레이어가 없어요 → 프로젝트 패널 › 새 항목 › 조정 레이어를 한 번 만들어 두면, 다음부터 이 버튼이 그걸 써서 넣어요": "No adjustment layer in the project → create one once via Project panel › New Item › Adjustment Layer, and this button will use it from then on",
    "검은 화면 그림을 가져오지 못했어요 → \"진단 정보 복사\"를 눌러 알려주세요": "Could not import the black image → press \"Copy diagnostics\" and send it",
    "\n우클릭: 삭제": "\nRight-click: delete"
  };
  /* 이어 붙인 문장 조각 (긴 것부터 바꿈) */
  var KO_EN_PART = {
    '선택 클립 ': 'selected clips ', ' · 오디오 ': ' · audio ', '길이 ': 'Length ', '속도 ': 'Speed ', '강도 ': 'Strength ', '기준점 ': 'Pivot ', '블러 ': 'Blur ',
    '직접 지정 (': 'Custom (', '기준점 가로 ': 'Pivot X ', '가로 ': 'X ', '% · 세로 ': '% · Y ', ' · 맞춤': ' · snapped',
    ' · 다음에 넣는 효과부터 적용돼요': ' · applies to the next effects', ' · 이제 넣는 효과가 이 점을 중심으로 움직여요': ' · new effects will move around this point',
    '✓ 기준점: ': '✓ Pivot: ', '✓ 글자 영역: ': '✓ Text area: ', ' · 복제용': ' · dup', '\n우클릭: 즐겨찾기': '\nRight-click: favorite',
    '오디오 효과: ': 'Audio effect: ', '효과: ': 'Effect: ', '오디오 효과 · ': 'Audio effect · ', '영역 보기 ': 'Area view ', '글자 · 자동 폭 ≈ ': ' chars · auto width ≈ ',
    ' 적용 · 자막 글자를 못 읽어서 "': ' applied · could not read the caption, so it uses "', ' 은 원본 위에 복제본이 있어야 해요 → ': ' needs a copy above the original → ',
    ' 효과를 못 찾았어요 → "진단 정보 복사"를 눌러 알려주세요': ': effect not found → press "Copy diagnostics" and send it',
    ' 적용 · 그런데 아래에 원본이 없어서 글자가 색으로만 나타나요 → 원본이 남아 있게 하려면 ': ' applied · but there is no original below, so only the colored text shows → to keep the original, ',
    ' · 글자 영역 자동 측정': ' · text area measured', ' · 글자 영역을 못 찾아 화면 전체 기준': ' · text area not found, using the full frame',
    ' — 원본을 Alt+드래그로 아래 트랙에 복사한 뒤, 아래 클립에 쓰는 효과예요': ' — Alt-drag a copy of the original to the track below and apply it to that copy',
    ' · 아래 원본 위에 색이 차올라요': ' · color fills over the original below', ' — 원본을 Alt+드래그로 위 트랙에 복사한 뒤, 위 클립에 쓰는 효과예요': ' — Alt-drag a copy to the track above and apply it to that copy',
    ' 적용 · 클립 ': ' applied · clips ', ' 추가 · 클립 ': ' added · clips ', '" 효과를 찾지 못했어요': '" not found', ' 을(를) 추가하지 못했어요': ": couldn't add",
    '진단 실패: ': 'Diagnostics failed: ', '✓ 커브 "': '✓ Curve "', '" 저장': '" saved', '✓ 커브 적용 · 속성 ': '✓ Curve applied · properties ',
    '✓ 원래 키프레임으로 복원 · 속성 ': '✓ Restored original keyframes · properties ', '프리미어와 연결하는 중… (': 'Connecting to Premiere… (',
    '✓ 새 버전으로 자동 업데이트됐어요 · ': '✓ Auto-updated to the new version · ', '준비 완료 · ': 'Ready · ',
    '프리미어와 연결되지 않았어요 — 프리미어를 재시작해 보세요 · 계속되면 "진단 정보 복사"를 눌러 알려주세요 (': 'Not connected to Premiere — try restarting Premiere · if it continues, press "Copy diagnostics" and send it (',
    '(자동 측정)': '(auto)', ' · 글자 경계 ': ' · ', '곳 맞춤': ' boundaries fitted', '), 폭 ': '), width ', '오류: ': 'Error: ', '선택한 ': 'Add to selected ', '클립에 추가': 'clips', '타임라인에서 ': 'In the timeline, ',
    '클립을 먼저 선택하세요': 'select a clip first',
    '프레임 추적 예정': ' frames to track',
    '프레임 (': ' frames (',
    ') · 정확도 ': ') · accuracy ',
    '프레임 · 약 ': ' frames · about ',
    '초 남음': 's left',
    '대상을 지정하고 \"추적 시작\"을 누르세요': 'Mark the subject and press "Start tracking"',
    ' · 인·아웃 구간이 클립과 겹치지 않아 클립 전체를 추적해요': ' · In–Out does not overlap the clip, tracking the whole clip',
    '추적할 구간이 너무 길어요 (': 'The range is too long (',
    '프레임) → 범위를 \"인·아웃 구간\"으로 줄이거나 간격을 늘려 주세요': ' frames) → shorten it with "In–Out range" or raise the interval',
    ' → \"진단 정보 복사\"를 눌러 알려주세요': ' → press "Copy diagnostics" and send it',
    ' · 중간에 대상을 놓쳐서 ': ' · lost the subject, only ',
    '프레임까지만 들어갔어요': ' frames were applied',
    ' · 중지한 곳까지만 들어갔어요': ' · applied up to where you stopped',
    '지금 추적 결과는 \"': 'The current track is for "',
    '\"용이에요 → \"': '" → for "',
    '\" 방식으로 다시 추적해 주세요': '" please track again in that mode',
    '개 · 모션에 키프레임 ': ' · Motion keyframes ',
    '개 · 변형 효과에 키프레임 ': ' · Transform keyframes ',
    '개 · 모퉁이 고정에 키프레임 ': ' · Corner Pin keyframes ',
    ' · 실패 ': ' · failed ',
    ' · 구간 밖 ': ' · out of range ',
    '개 제외': ' skipped',
    '✓ 추적 키프레임 지움 · 모션 속성 ': '✓ Tracking keyframes cleared · Motion properties ',
    '개 · 모퉁이 고정 ': ' · Corner Pin ',
    ' · 변형 효과에 넣은 추적은 위의 \"효과 지우기\"로 지워요': ' · tracking written to a Transform effect is removed with "Clear effects" above',
    "✓ 곡선 적용 · ": "✓ Curve applied · ",
    " · 속성 ": " · properties ",
    "✓ 곡선 \"": "✓ Curve \"",
    "✓ Linear · 원래 키프레임으로 되돌림 · 속성 ": "✓ Linear · restored original keyframes · properties ",
    "모션 → 변형 효과로 옮기고 블러 ": "moved Motion → Transform with blur ",
    "블러 켬 ": "blur on ",
    "모션블러를 넣지 못했어요 · ": "Could not add motion blur · ",
    " · 건너뜀: ": " · skipped: ",
    "움직임(키프레임)이 없음 ": "no keyframes ",
    "이미 변형 효과에 키프레임이 있음 ": "Transform already keyed ",
    "영상 크기가 시퀀스와 달라서 옮기면 화면이 바뀜 ": "clip size differs from sequence ",
    "모션 위치·크기를 고정값으로 바꿔 둔 클립 ": "Motion has fixed changed values ",
    "변형 효과를 추가하지 못함 ": "could not add Transform ",
    "검은 화면을(를) 넣지 못했어요 (": "Could not insert black screen (",
    "조정 레이어을(를) 넣지 못했어요 (": "Could not insert adjustment layer (",
    "✓ 검은 화면 ": "✓ Black screen ",
    "✓ 조정 레이어 ": "✓ Adjustment layer ",
    '\n☆: 즐겨찾기 (미니 패널에도 나와요)': '\n☆: favorite (also shown in the Mini panel)',
    '\n우클릭: 즐겨찾기 빼기': '\nRight-click: remove from favorites',
    '고정': 'Stabilize'
  };
  var KO_EN_RULES = [
    [/선택 (\d+)개/g, 'Selected $1'], [/선택 클립 (\d+)개에 바로 반영/g, 'applied to $1 selected clip(s)'], [/✓ 모션 효과 (\d+)개 삭제/g, '✓ Removed $1 motion effects'],
    [/\((\d+)글자\) 기준이에요 → 타이핑 설정 "문장"에 자막 내용을 넣어주세요/g, '($1 chars) → type the caption into Typing settings "Text"'],
    [/(\d+)글자\(/g, '$1 chars ('], [/(\d+)개 완료, (\d+)개 실패 \(/g, '$1 done, $2 failed ('], [/([\d.]+)초/g, '$1s'], [/(\d+)개/g, '$1']
  ];
  var PART_KEYS = Object.keys(KO_EN_PART).concat(Object.keys(KO_EN).filter(function (k) { return k.length >= 3; }))
    .sort(function (a, b) { return b.length - a.length; });
  var HANGUL = /[가-힣]/;
  function tr(t) {
    if (LANG !== 'en' || !t || !HANGUL.test(t)) return t;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t), core = m[2];
    if (KO_EN.hasOwnProperty(core)) return m[1] + KO_EN[core] + m[3];
    var s = t, i;
    for (i = 0; i < KO_EN_RULES.length - 2; i++) s = s.replace(KO_EN_RULES[i][0], KO_EN_RULES[i][1]);
    for (i = 0; i < PART_KEYS.length && HANGUL.test(s); i++) {
      var k = PART_KEYS[i];
      if (s.indexOf(k) >= 0) s = s.split(k).join(KO_EN_PART.hasOwnProperty(k) ? KO_EN_PART[k] : KO_EN[k]);
    }
    for (i = KO_EN_RULES.length - 2; i < KO_EN_RULES.length; i++) s = s.replace(KO_EN_RULES[i][0], KO_EN_RULES[i][1]);
    return s;
  }
  /* 프리셋/묶음/카테고리 이름 */
  function isEn() { return LANG === 'en'; }
  function nameOf(p) { return isEn() && MK.EN.P[p.id] ? MK.EN.P[p.id][0] : p.name; }
  function descOf(p) { return isEn() && MK.EN.P[p.id] ? MK.EN.P[p.id][1] : p.desc; }
  function vOf(p) { var v = p.v || p.name; return isEn() ? (MK.EN.V[v] || (p.v ? v : nameOf(p))) : v; }
  function gName(g) { return isEn() ? (g.en || g.name) : g.name; }
  function gDesc(id, g) { return isEn() ? (MK.EN.G[id] || '') : (g.desc || ''); }
  function catLabel(c) { return isEn() ? (MK.EN.CAT[c.id] || c.label) : c.label; }
  function subLabel(s) { return isEn() ? (MK.EN.SUB[s] || s) : s; }
  /* 화면 글자 노드 번역 (원래 한글은 노드에 기억) */
  function trText(n) {
    if (n.__out === n.data) return;
    n.__ko = n.data;
    var o = tr(n.data); n.__out = o;
    if (o !== n.data) n.data = o;
  }
  var TR_ATTR = ['title', 'placeholder', 'aria-label'];
  function trAttrs(el) {
    if (!el.getAttribute) return;
    el.__koA = el.__koA || {}; el.__outA = el.__outA || {};
    for (var i = 0; i < TR_ATTR.length; i++) {
      var a = TR_ATTR[i], v = el.getAttribute(a);
      if (v === null || v === el.__outA[a]) continue;
      el.__koA[a] = v; var o = tr(v); el.__outA[a] = o;
      if (o !== v) el.setAttribute(a, o);
    }
  }
  function skipNode(el) { return el && el.closest && el.closest('.noTr, script, style, textarea'); }
  function trTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipNode(root.parentNode)) trText(root); return; }
    if (root.nodeType !== 1 || skipNode(root)) return;
    trAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 1) { if (skipNode(n)) continue; trAttrs(n); }
      else if (!skipNode(n.parentNode)) trText(n);
    }
  }
  /* 한국어로 되돌릴 때: 기억해 둔 한글로 */
  function untrTree(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (n.__ko !== undefined && n.data === n.__out) { n.__out = n.__ko; n.data = n.__ko; } }
      else if (n.__koA) for (var a in n.__koA) if (n.getAttribute(a) === n.__outA[a]) { n.__outA[a] = n.__koA[a]; n.setAttribute(a, n.__koA[a]); }
    }
  }
  var trObs = null;
  function watchLang() {
    if (trObs || !window.MutationObserver) return;
    trObs = new MutationObserver(function (list) {
      if (LANG !== 'en') return;
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) trTree(m.addedNodes[j]);
        else if (m.type === 'characterData') { if (!skipNode(m.target.parentNode)) trText(m.target); }
        else if (m.type === 'attributes') { if (!skipNode(m.target)) trAttrs(m.target); }
      }
    });
    trObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTR });
  }

  /* ---------- 프리미어 호출 ---------- */
  function parse(r) {
    try { return JSON.parse(r); } catch (e) { return { ok: false, err: 'parse', msg: String(r) }; }
  }
  function host(script) {
    return new Promise(function (resolve) {
      if (cep) cep.evalScript(script, function (r) { resolve(parse(r)); });
      else if (window.MK_MOCK) resolve(parse(window.MK_MOCK(script)));
      else resolve({ ok: false, err: 'nocep' });
    });
  }
  /* 한글이 섞여도 안전하도록 \uXXXX 로 바꿔서 넘긴다 */
  function call(fn, data) {
    if (data === undefined) return host(fn + '()');
    var arg = JSON.stringify(JSON.stringify(data)).replace(/[\u0080-￿]/g, function (c) {
      return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
    return host(fn + '(' + arg + ')');
  }
  var ERR = {
    noseq: '시퀀스를 먼저 열어주세요',
    notf: '변형(Transform) 효과를 추가하지 못했어요',
    noqe: '효과를 추가할 수 없어요 (QE 사용 불가)',
    nocep: '프리미어 프로 안에서 열어주세요',
    parse: '프리미어 응답을 읽지 못했어요',
    nobelow: '아래 트랙에 원본 자막이 없어요'
  };
  var FXNAME = { chroma: 'VR 색수차', post: '시간 포스터화', tint: '색조', bc: '밝기 및 대비', proc: 'ProcAmp', crop: '자르기', gblur: '가우시안 흐림', turb: '난류 변위', dblur: '방향 흐림', wwarp: '파도 비틀기', lwipe: '선형 닦아내기', ramp: '경사(Ramp)', tmk: '트랙 매트 키' };
  var NOTES = { motion: '모션의 기본 자르기 사용', lwipe: '자르기 대신 선형 닦아내기 사용', nodup: '' };
  var DUP_HOW = '자막을 Alt 를 누른 채 바로 위 트랙으로 끌어서 같은 위치에 복제 → 위쪽 복제본을 선택하고 다시 누르세요';
  function errText(r) { return ERR[r.err] || ('오류: ' + (r.msg || r.err)); }

  /* ---------- 상태 표시 ---------- */
  var statusEl = document.getElementById('status'), miniStatusEl = document.getElementById('miniStatus');
  function status(msg, cls) {
    statusEl.textContent = msg; statusEl.className = cls || '';
    miniStatusEl.textContent = msg; miniStatusEl.className = 'miniStatus ' + (cls || '');
    miniStatusEl.title = msg;
  }

  /* ---------- 설정 (전체 패널 ↔ 미니 패널 공유) ----------
   * 두 패널이 같은 설정 파일을 씀. 저장할 때는 "내가 바꾼 항목만" 최신 파일에 덮어써서
   * 다른 패널에서 바꾼 내용을 지우지 않는다(3-way 병합). 저장 후 다른 패널에 바로 알림.
   */
  var DEF = {
    opts: { size: 3, speed: 3, dur: 0, zoomRate: 0, anchor: 'start', blur: true, cat: 'all', step: 1, mini: false, scope: 'all',
      kinds: { pos: true, scale: true, rot: true, op: true, other: false }, curveAll: true,
      typing: { text: '', fpc: 4, width: '', center: '' }, outside: false, pivot: [0.5, 0.5], autoArea: true, fillColor: 'yellow',
      trk: { mode: 'follow', range: 'clip', step: 1, pos: true, scale: true, rot: true, smooth: 15, blur: false, zoom: 100 } },
    tipOff: false,
    lang: 'ko',
    mig: 0,
    favs: MK.DEFAULT_FAVS.slice(),
    fxFavs: [],
    curve: MK.EASES.out.slice(),
    mine: []
  };
  var LOCAL = { 'opts.mini': 1 };                    // 패널마다 따로 (접힘 상태)
  var INSTANCE = (FORCE_MINI ? 'mini' : 'main') + Math.random().toString(36).slice(2, 8);
  function fill(dst, def) {
    for (var k in def) {
      if (dst[k] === undefined || dst[k] === null) dst[k] = JSON.parse(JSON.stringify(def[k]));
      else if (typeof def[k] === 'object' && !Array.isArray(def[k])) fill(dst[k], def[k]);
    }
    return dst;
  }
  function flat(o, pre, out) {
    out = out || {};
    for (var k in o) {
      var v = o[k], p = pre ? pre + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, p, out); else out[p] = JSON.stringify(v);
    }
    return out;
  }
  function setPath(o, path, v) {
    var ks = path.split('.');
    for (var i = 0; i < ks.length - 1; i++) { if (typeof o[ks[i]] !== 'object' || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function parseSettings(txt) {
    try {
      var v = txt ? JSON.parse(txt) : null;
      if (typeof v === 'string') v = JSON.parse(v);          // 예전 버전이 두 번 감싸 저장한 파일도 읽기
      return v && typeof v === 'object' ? fill(v, DEF) : null;
    } catch (e) { return null; }
  }
  var S = parseSettings((function () { try { return localStorage.getItem('mmk.settings'); } catch (e) { return null; } })()) || fill({}, DEF);
  try { S.opts.mini = !FORCE_MINI && localStorage.getItem('mmk.collapsed') === '1'; } catch (e) { S.opts.mini = false; }
  var opts = S.opts, base = flat(S), saveTimer = 0, flushing = false, flushAgain = false;
  function persistLocal() {
    try { localStorage.setItem('mmk.settings', JSON.stringify(S)); if (!FORCE_MINI) localStorage.setItem('mmk.collapsed', opts.mini ? '1' : '0'); } catch (e) {}
  }
  /* 다른 패널이 바꾼 항목을 내 설정에 반영 (내가 안 바꾼 항목만) */
  function pull(remote) {
    var rf = flat(remote), cur = flat(S), got = false;
    for (var k in rf) {
      if (LOCAL[k] || rf[k] === base[k]) continue;
      if (cur[k] === base[k] || cur[k] === undefined) { setPath(S, k, JSON.parse(rf[k])); got = true; }
      base[k] = rf[k];
    }
    return got;
  }
  function save() { persistLocal(); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 200); try { paintSum(); } catch (e) {} }
  async function flush() {
    if (flushing) { flushAgain = true; return; }
    flushing = true;
    try {
      var cur = flat(S), changed = [];
      for (var k in cur) if (!LOCAL[k] && cur[k] !== base[k]) changed.push(k);
      if (!changed.length) return;
      var r = await call('mk_loadSettings');
      var remote = (r.ok && parseSettings(r.data)) || JSON.parse(JSON.stringify(S));
      var got = pull(remote);
      changed.forEach(function (k) { setPath(remote, k, JSON.parse(cur[k])); });
      delete remote.opts.mini;
      var w = await call('mk_saveSettings', remote);   // 객체 그대로 (문자열로 두 번 감싸지 않게)
      if (w.ok) {
        var nb = flat(remote); for (var q in nb) base[q] = nb[q];
        broadcast();
      }
      persistLocal();
      if (got) refreshAll();
    } finally {
      flushing = false;
      if (flushAgain) { flushAgain = false; flush(); }
    }
  }
  var lastSync = 0;
  function sync(force, after) {
    var now = Date.now();
    if (flushing || (!force && now - lastSync < 800)) { if (after) after(null); return; }
    lastSync = now;
    call('mk_loadSettings').then(function (r) {
      var remote = r.ok && parseSettings(r.data);
      if (remote && !flushing && pull(remote)) { persistLocal(); if (S.lang !== LANG) applyLang(); else refreshAll(); }
      if (after) after(remote || null);
    });
  }
  /* 패널 사이 즉시 알림 (CEP 이벤트) + 혹시 못 받을 때를 위한 주기 확인 */
  var EVT = 'com.moment.motionkit.sync';
  function broadcast() {
    try { if (cep && cep.dispatchEvent) cep.dispatchEvent({ type: EVT, scope: 'APPLICATION', appId: '', extensionId: '', data: INSTANCE }); } catch (e) {}
  }
  try { if (cep && cep.addEventListener) cep.addEventListener(EVT, function (ev) { if (!ev || String(ev.data) !== INSTANCE) sync(true); }); } catch (e) {}
  window.addEventListener('focus', function () { sync(); });
  document.documentElement.addEventListener('mouseenter', function () { sync(); });
  setInterval(function () { if (!document.hidden) sync(true); }, 3000);

  /* ---------- 탭 ---------- */
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.id === 'tab-' + b.dataset.tab); });
      if (b.dataset.tab === 'curve') drawCurve();
      if (b.dataset.tab === 'fx') openFxTab();
      if (b.dataset.tab === 'track') openTrkTab();
      btnFold.style.visibility = b.dataset.tab === 'motion' ? '' : 'hidden';
    });
  });

  /* ---------- 작게 접기 / 미니 ---------- */
  var btnMini = document.getElementById('btnMini');
  function isMini() { return FORCE_MINI || opts.mini || window.innerWidth < 200 || window.innerHeight < 230; }
  var wasMini = null;
  function layout() {
    var m = isMini();
    document.body.classList.toggle('mini', m);
    document.body.classList.toggle('tiny', window.innerWidth < 120);
    document.body.classList.toggle('narrow', window.innerWidth < 170);
    if (FORCE_MINI) { btnMini.textContent = '⤢'; btnMini.title = '전체 패널 열기'; }
    else { btnMini.textContent = m ? '⤢' : '▁'; btnMini.title = m ? '크게 펼치기' : '작게 접기 (즐겨찾기만 보기)'; }
    var sh = m && window.innerHeight < 160;          // 가로 툴바처럼 납작하면 머리줄 숨김
    document.body.classList.toggle('short', sh);
    var key = m + '|' + sh;
    if (key !== wasMini) { wasMini = key; if (m) renderMini(); }
  }
  function expandClick() {
    if (FORCE_MINI) {
      if (cep && cep.requestOpenExtension) cep.requestOpenExtension(MAIN_ID, '');
      else status('창 > 확장 프로그램 > Moment_Motion Kit 을 여세요', 'warn');
      return;
    }
    if (isMini() && !opts.mini) { status('패널 창을 조금 더 크게 늘리면 펼쳐져요', 'warn'); return; }
    opts.mini = !opts.mini; save(); layout();
  }
  btnMini.addEventListener('click', expandClick);
  window.addEventListener('resize', layout);

  /* ---------- 세그먼트 버튼 ---------- */
  var segs = [];
  function seg(el, values, labels, get, set) {
    if (values) {
      el.innerHTML = '';
      values.forEach(function (v, i) {
        var b = document.createElement('button'); b.dataset.v = v; b.textContent = labels ? labels[i] : v; el.appendChild(b);
      });
    }
    function paint() { el.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', String(get()) === b.dataset.v); }); }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      set(b.dataset.v); paint(); save();
    });
    segs.push(paint); paint();
  }
  seg(document.getElementById('optSize'), ['1', '2', '3', '4', '5'], null,
    function () { return opts.size; }, function (v) { opts.size = +v; renderGrid(); renderMini(); });
  seg(document.getElementById('optSpeed'), ['1', '2', '3', '4', '5'], ['느림', '2', '3', '4', '빠름'],
    function () { return opts.speed; }, function (v) { opts.speed = +v; renderGrid(); renderMini(); });
  seg(document.getElementById('optAnchor'), null, null,
    function () { return opts.anchor; }, function (v) { opts.anchor = v; });
  var zoomRow = document.getElementById('zoomRow');
  seg(document.getElementById('optZoomRate'), ['0', '1', '2', '3', '5'], ['클립에 맞춤', '1%/s', '2%/s', '3%/s', '5%/s'],
    function () { return opts.zoomRate || 0; }, function (v) { opts.zoomRate = +v; renderGrid(); renderMini(); });
  seg(document.getElementById('optCurveAll'), null, null,
    function () { return opts.curveAll === false ? '0' : '1'; }, function (v) { opts.curveAll = v === '1'; paintKindsRow(); });
  seg(document.getElementById('optStep'), null, null,
    function () { return opts.step; }, function (v) { opts.step = +v; });
  seg(document.getElementById('optFpc'), ['2', '3', '4', '6'], ['2f 빠름', '3f', '4f 보통', '6f 천천히'],
    function () { return opts.typing.fpc; }, function (v) { opts.typing.fpc = +v; renderGrid(); });

  var blurBtn = document.getElementById('optBlur');
  function paintBlur() { blurBtn.classList.toggle('on', !!opts.blur); }
  blurBtn.addEventListener('click', function () { opts.blur = !opts.blur; paintBlur(); save(); });

  /* ---------- 지속 시간 (드래그 슬라이더) ---------- */
  var durCtls = [], lastFps = 30, lastManual = 0.5, speedRow = document.getElementById('speedRow');
  function fmtSec(v) { return (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : v.toFixed(0)) + '초'; }
  function durLabel(v) { return fmtSec(v) + ' · ' + Math.round(v * lastFps) + 'f'; }
  function durCtl(holder, compact) {
    var wrap = document.createElement('div'); wrap.className = 'durCtl';
    var auto = document.createElement('button'); auto.className = 'chipA'; auto.textContent = '자동';
    auto.title = '자동: 프리셋 기본 길이 × 속도';
    var track = document.createElement('div'); track.className = 'durTrack';
    var range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = 1000; range.step = 1;
    var bubble = document.createElement('output'); bubble.className = 'bubble';
    track.appendChild(range); track.appendChild(bubble);
    if (!compact) {
      var ticks = document.createElement('div'); ticks.className = 'ticks';
      [0.2, 0.5, 1, 2, 5].forEach(function (t) {
        var sp = document.createElement('span'); sp.textContent = t < 1 ? String(t).replace('0.', '.') : t + 's';
        sp.style.left = (MK.secToPos(t) / 10) + '%'; ticks.appendChild(sp);
      });
      track.appendChild(ticks);
    }
    var val = document.createElement('input'); val.className = 'durVal'; val.title = '직접 입력도 돼요 (초)';
    wrap.appendChild(auto); wrap.appendChild(track); wrap.appendChild(val);
    holder.innerHTML = ''; holder.appendChild(wrap);
    function place() {
      var p = +range.value;
      bubble.style.left = 'calc(' + (p / 10) + '% + ' + (7 - p / 1000 * 14) + 'px)';
    }
    function paint() {
      var a = !(opts.dur > 0);
      wrap.classList.toggle('auto', a); auto.classList.toggle('on', a);
      if (!track.classList.contains('drag')) range.value = MK.secToPos(a ? lastManual : opts.dur);
      if (document.activeElement !== val) val.value = a ? (isEn() ? 'Auto' : '자동') : tr(fmtSec(opts.dur));
      place();
    }
    range.addEventListener('pointerdown', function () { track.classList.add('drag'); });
    range.addEventListener('input', function () {
      track.classList.add('drag');
      opts.dur = lastManual = MK.posToSec(+range.value);
      bubble.textContent = durLabel(opts.dur);
      paintDur();
    });
    function end() {
      if (!track.classList.contains('drag')) return;
      track.classList.remove('drag'); save(); renderGrid(); renderMini();
    }
    range.addEventListener('change', end);
    range.addEventListener('pointerup', end);
    auto.addEventListener('click', function () {
      opts.dur = opts.dur > 0 ? 0 : lastManual;
      paintDur(); save(); renderGrid(); renderMini();
      status(opts.dur > 0 ? '길이 ' + durLabel(opts.dur) + ' 로 지정' : '길이 자동 (프리셋 기본 × 속도)', 'ok');
    });
    val.addEventListener('focus', function () { val.select(); });
    val.addEventListener('change', function () {
      var v = parseFloat(String(val.value).replace(/[^\d.]/g, ''));
      opts.dur = v > 0 ? Math.max(0.05, Math.min(10, v)) : 0;
      if (opts.dur) lastManual = opts.dur;
      val.blur(); paintDur(); save(); renderGrid(); renderMini();
    });
    durCtls.push(paint);
  }
  function paintDur() {
    durCtls.forEach(function (p) { p(); });
    speedRow.style.display = opts.dur > 0 ? 'none' : '';
  }
  durCtl(document.getElementById('fullDur'), false);
  durCtl(document.getElementById('miniDur'), true);

  /* ---------- 타이핑 설정 ---------- */
  var tyText = document.getElementById('tyText'), tyW = document.getElementById('tyWidth'), tyC = document.getElementById('tyCenter'),
      tyWAuto = document.getElementById('tyWAuto'), tyWVal = document.getElementById('tyWVal'), tyCVal = document.getElementById('tyCVal'),
      tyFrameBtn = document.getElementById('tyFrame'), tyAuto = document.getElementById('typingAuto'),
      typingBox = document.getElementById('typingOpts');
  var frameOn = false, autoW = 0;
  var SRC = { input: '직접 입력한 문장', source: '자막 글자 읽음', name: '클립 이름 사용', guess: '자막 글자를 못 읽음' };
  function centerVal() { var c = opts.typing.center; return c === '' || c == null ? 50 : +c; }
  function paintTyping() {
    if (document.activeElement !== tyText) tyText.value = opts.typing.text || '';
    var wAuto = !(opts.typing.width > 0);
    typingBox.classList.toggle('wauto', wAuto); tyWAuto.classList.toggle('on', wAuto);
    tyW.value = wAuto ? (autoW || 34) : opts.typing.width;
    tyWVal.textContent = wAuto ? (autoW ? autoW + '%' : '자동') : Math.round(opts.typing.width) + '%';
    tyC.value = centerVal(); tyCVal.textContent = centerVal() + '%';
    tyFrameBtn.classList.toggle('on', frameOn); tyFrameBtn.textContent = frameOn ? '영역 보기 끄기' : '영역 보기';
    if (opts.typing.text) {
      var lay = MK.typingLayout(opts.typing.text, { w: 1920, h: 1080 }, {});
      tyAuto.textContent = lay.chars.length + '글자 · 자동 폭 ≈ ' + lay.auto + '% (16:9)';
    } else tyAuto.textContent = '자동: 자막 글자 → 클립 이름 순으로 읽음';
  }
  var ctxCache = null, ctxTime = 0;
  async function getCtx(fresh) {
    if (!fresh && ctxCache && Date.now() - ctxTime < 2500) return ctxCache;
    var c = await call('mk_context');
    if (c.ok) { ctxCache = c; ctxTime = Date.now(); lastFps = c.fps; }
    return c;
  }
  var frameBusy = false, frameAgain = false;
  async function pushFrame() {
    if (!frameOn) return;
    if (frameBusy) { frameAgain = true; return; }
    frameBusy = true;
    try {
      var c = await getCtx();
      if (!c.ok) { status(errText(c), 'err'); return; }
      if (!c.clips.length) { status('자막 클립을 먼저 선택하세요', 'warn'); return; }
      var src = MK.typingText(c.clips[0], opts.typing), lay = MK.typingLayout(src.text, c, opts.typing);
      autoW = lay.auto;
      var r = await call('mk_typingFrame', { on: true, L: lay.L, R: lay.R });
      if (!r.ok) { status(errText(r), 'err'); return; }
      if (r.nofx) { status('자르기 효과를 쓸 수 없어서 영역 보기가 안 돼요 → 아래 "진단 정보 복사"를 눌러 알려주세요', 'err'); return; }
      status('영역 보기 ' + Math.round(lay.L) + '% ~ ' + Math.round(lay.R) + '% · "' + src.text.slice(0, 12) + '" (' + SRC[src.from] + ')',
        src.from === 'guess' ? 'warn' : 'ok');
      paintTyping();
    } finally {
      frameBusy = false;
      if (frameAgain) { frameAgain = false; pushFrame(); }
    }
  }
  tyText.addEventListener('input', function () { opts.typing.text = tyText.value; paintTyping(); save(); pushFrame(); });
  tyW.addEventListener('input', function () { opts.typing.width = +tyW.value; paintTyping(); pushFrame(); });
  tyW.addEventListener('change', function () { save(); renderGrid(); });
  tyC.addEventListener('input', function () { opts.typing.center = +tyC.value; paintTyping(); pushFrame(); });
  tyC.addEventListener('change', function () { save(); });
  tyWAuto.addEventListener('click', function () {
    opts.typing.width = opts.typing.width > 0 ? '' : (autoW || +tyW.value || 34);
    paintTyping(); save(); pushFrame();
  });
  tyFrameBtn.addEventListener('click', async function () {
    frameOn = !frameOn; paintTyping();
    if (frameOn) { ctxCache = null; pushFrame(); }
    else {
      var r = await call('mk_typingFrame', { on: false });
      status(r.ok ? '영역 보기를 껐어요' : errText(r), r.ok ? 'ok' : 'err');
    }
  });

  /* ---------- 등장: 프레임 밖에서 꽂기 ---------- */
  seg(document.getElementById('optOutside'), null, null,
    function () { return opts.outside ? '1' : '0'; }, function (v) { opts.outside = v === '1'; renderGrid(); renderMini(); });

  /* ---------- 설정 접기 + 한 줄 요약 (위쪽은 고정, 아래 효과 목록만 스크롤) ---------- */
  var motionOpts = document.getElementById('motionOpts'), optSum = document.getElementById('optSum'), btnFold = document.getElementById('btnFold');
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var FOLD_KEY = 'mmk.fold' + (FORCE_MINI ? '.mini' : '');
  function setFold(on) {
    motionOpts.classList.toggle('folded', on);
    btnFold.textContent = on ? '설정 ▾' : '설정 ▴';
    btnFold.title = on ? '설정 펼치기' : '설정 접기 (효과 목록을 넓게)';
    lsSet(FOLD_KEY, on ? '1' : '0');
  }
  btnFold.addEventListener('click', function () { setFold(!motionOpts.classList.contains('folded')); });
  optSum.addEventListener('click', function () { setFold(false); });
  function paintSum() {
    var pv = opts.pivot || [0.5, 0.5], parts = [];
    parts.push('강도 <b>' + (opts.size || 3) + '</b>');
    parts.push(opts.dur > 0 ? '길이 <b>' + fmtSec(opts.dur) + '</b>' : '속도 <b>' + (opts.speed || 3) + '</b>');
    parts.push('<b>' + (opts.anchor === 'start' ? '클립 시작' : '재생헤드') + '</b>');
    if (opts.outside) parts.push('<b>밖에서 꽂기</b>');
    parts.push('기준점 <b>' + pivLabel.textContent.replace(/^직접 지정 /, '') + '</b>');
    parts.push('블러 <b>' + (opts.blur ? '켬' : '끔') + '</b>');
    optSum.innerHTML = parts.join(' · ') + ' <i>▾ 설정</i>';
  }

  /* ---------- 기준점 (확대·회전 중심) ---------- */
  var pivGrid = document.getElementById('pivGrid'), pivLabel = document.getElementById('pivLabel');
  var PIV = [[0.25, 0.25, '왼쪽 위'], [0.5, 0.25, '위'], [0.75, 0.25, '오른쪽 위'], [0.25, 0.5, '왼쪽'], [0.5, 0.5, '가운데'], [0.75, 0.5, '오른쪽'],
    [0.25, 0.75, '왼쪽 아래'], [0.5, 0.75, '아래'], [0.75, 0.75, '오른쪽 아래']];
  PIV.forEach(function (p) {
    var b = document.createElement('button'); b.title = p[2];
    b.addEventListener('click', function () { opts.pivot = [p[0], p[1]]; paintPivot(); save(); applyPivot(); });
    pivGrid.appendChild(b);
  });
  function samePt(a, b) { return Math.abs(a[0] - b[0]) < 0.005 && Math.abs(a[1] - b[1]) < 0.005; }
  function paintPivot() {
    var pv = opts.pivot || [0.5, 0.5], hit = null;
    pivGrid.querySelectorAll('button').forEach(function (b, i) { var on = samePt(PIV[i], pv); b.classList.toggle('on', on); if (on) hit = PIV[i][2]; });
    pivLabel.textContent = hit || ('직접 지정 (' + Math.round(pv[0] * 100) + '%, ' + Math.round(pv[1] * 100) + '%)');
    try { paintSum(); } catch (e) {}
  }
  /* 화면 캡처 → 클릭으로 지정 */
  var pickBox = document.getElementById('pickBox'), pickImg = document.getElementById('pickImg'), pickPic = document.getElementById('pickPic'), pickDot = document.getElementById('pickDot');
  function loadFrame(path) {
    return new Promise(function (res) {
      var src = null;
      try {
        var CF = window.cep;   /* CEP 파일 읽기 (변수 cep 는 __adobe_cep__ 라서 window.cep 를 씀) */
        if (CF && CF.fs && CF.fs.readFile) {
          var rr = CF.fs.readFile(path, CF.encoding ? CF.encoding.Base64 : 'Base64');
          if (rr && rr.err === 0 && rr.data) src = 'data:image/png;base64,' + rr.data;
        }
      } catch (e) {}
      if (!src) src = 'file:///' + String(path).replace(/\\/g, '/').replace(/^\/+/, '');
      var im = new Image();
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function pct(v) { return Math.round(v * 100); }
  var pickRead = document.getElementById('pickRead'), pickGv = document.getElementById('pickGv'), pickGh = document.getElementById('pickGh');
  var snapX = false, snapY = false;
  function placeDot() {
    var pv = opts.pivot || [0.5, 0.5];
    pickDot.style.left = pickGv.style.left = (pv[0] * 100) + '%';
    pickDot.style.top = pickGh.style.top = (pv[1] * 100) + '%';
    pickGv.classList.toggle('snap', snapX); pickGh.classList.toggle('snap', snapY);
    pickRead.textContent = '가로 ' + pct(pv[0]) + '% · 세로 ' + pct(pv[1]) + '%' + (snapX || snapY ? ' · 맞춤' : '');
  }
  /* 기준점을 이미 모션이 들어간 선택 클립에도 바로 반영 */
  var pivTimer = null;
  function applyPivot(quiet) {
    clearTimeout(pivTimer);
    pivTimer = setTimeout(async function () {
      var pv = opts.pivot || [0.5, 0.5];
      var r = await call('mk_setPivot', { pivot: pv });
      if (quiet) return;
      var head = '기준점 가로 ' + pct(pv[0]) + '% · 세로 ' + pct(pv[1]) + '%';
      if (!r.ok) return status(head + ' · 다음에 넣는 효과부터 적용돼요', 'ok');
      status(head + (r.done ? ' · 선택 클립 ' + r.done + '개에 바로 반영' : ' · 이제 넣는 효과가 이 점을 중심으로 움직여요'), 'ok');
    }, 120);
  }
  /* 화면 캡처 → 점을 끌거나 클릭해서 지정 (가운데·3분할 선에 살짝 붙음, Shift = 안 붙음) */
  var SNAPS = [1 / 3, 0.5, 2 / 3], SNAP_D = 0.018;
  function snapTo(v, free) {
    if (!free) for (var i = 0; i < SNAPS.length; i++) if (Math.abs(v - SNAPS[i]) < SNAP_D) return { v: SNAPS[i], hit: true };
    return { v: v, hit: false };
  }
  function pickAt(e) {
    var rc = pickImg.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (e.clientX - rc.left) / rc.width)), y = Math.max(0, Math.min(1, (e.clientY - rc.top) / rc.height));
    var sx = snapTo(x, e.shiftKey), sy = snapTo(y, e.shiftKey);
    snapX = sx.hit; snapY = sy.hit;
    opts.pivot = [Math.round(sx.v * 1000) / 1000, Math.round(sy.v * 1000) / 1000];
    placeDot(); paintPivot();
  }
  var picking = false;
  pickImg.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault(); stopPreview(); picking = true; pickImg.classList.add('drag'); pickAt(e);
  });
  document.addEventListener('mousemove', function (e) { if (picking) pickAt(e); });
  document.addEventListener('mouseup', function () {
    if (!picking) return;
    picking = false; pickImg.classList.remove('drag');
    save(); applyPivot(); playPreview();
  });
  /* 캡처가 안 될 때도 점은 옮길 수 있게: 시퀀스 비율의 빈 화면 + 3분할 선 */
  function blankFrame(w, h) {
    var W = 480, H = Math.max(120, Math.round(W * (h || 1080) / (w || 1920)));
    if (H > 860) { W = Math.round(W * 860 / H); H = 860; }
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
    [1 / 3, 2 / 3].forEach(function (k) { g.beginPath(); g.moveTo(W * k, 0); g.lineTo(W * k, H); g.moveTo(0, H * k); g.lineTo(W, H * k); g.stroke(); });
    g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '13px sans-serif'; g.textAlign = 'center';
    g.fillText('화면 캡처를 못 해서 빈 화면이에요', W / 2, H / 2 + 28);
    return c.toDataURL('image/png');
  }
  /* 불러온 캡처를 메모리(data URL)로 옮겨두고, 파일은 바로 지운다 */
  function toDataUrl(im) {
    if (/^data:/.test(im.src)) return im.src;
    try {
      var c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
      c.getContext('2d').drawImage(im, 0, 0); return c.toDataURL('image/png');
    } catch (e) { return null; }
  }
  var keepFrame = null;     /* 메모리로 못 옮긴 캡처 → 창을 닫을 때 지움 */
  function dropFrame(path) { if (path) call('mk_delFrame', { path: path }); }
  /* 미리보기: 이 점을 중심으로 줌되는 모습 */
  var pickAnim = null;
  function playPreview() {
    var pv = opts.pivot || [0.5, 0.5];
    if (pickAnim) { try { pickAnim.cancel(); } catch (e) {} pickAnim = null; }
    pickPic.style.transformOrigin = (pv[0] * 100) + '% ' + (pv[1] * 100) + '%';
    if (!pickPic.animate) return;
    pickAnim = pickPic.animate([
      { transform: 'scale(1) rotate(0deg)', offset: 0 },
      { transform: 'scale(1.35) rotate(0deg)', offset: 0.38 },
      { transform: 'scale(1.35) rotate(0deg)', offset: 0.55 },
      { transform: 'scale(1.18) rotate(-6deg)', offset: 0.75 },
      { transform: 'scale(1) rotate(0deg)', offset: 1 }
    ], { duration: 1700, easing: 'ease-in-out' });
  }
  function stopPreview() { if (pickAnim) { try { pickAnim.cancel(); } catch (e) {} pickAnim = null; } }
  document.getElementById('pickPlay').addEventListener('click', playPreview);
  var picking0 = false;
  document.getElementById('btnPick').addEventListener('click', async function () {
    if (picking0) return;
    picking0 = true;
    try {
      status('화면을 캡처하는 중…');
      var r = await call('mk_grabFrame', {});
      var im = r.ok ? await loadFrame(r.path) : null, src = null;
      if (im) {
        src = toDataUrl(im);
        if (src) dropFrame(r.path);          /* 쓰고 바로 삭제 */
        else { src = im.src; keepFrame = r.path; }
      } else {
        if (r.ok) dropFrame(r.path);
        var c = await getCtx(false);
        src = blankFrame(c && c.w, c && c.h);
        lastGrabErr = r.ok ? 'load' : (r.err + (r.msg ? ' (' + r.msg + ')' : ''));
      }
      pickPic.src = src; snapX = snapY = false; pickBox.classList.add('show'); placeDot();
      status(im ? '점을 드래그하거나 클릭하세요 · 놓으면 그 점을 중심으로 줌되는 모습을 보여줘요'
                : '화면 캡처가 안 돼서 빈 화면에 표시했어요 · 점은 그대로 옮길 수 있어요 (진단 정보 복사로 알려주세요)', im ? 'ok' : 'warn');
    } finally { picking0 = false; }
  });
  function closePick() {
    stopPreview(); pickBox.classList.remove('show'); pickPic.removeAttribute('src');
    if (keepFrame) { dropFrame(keepFrame); keepFrame = null; }
    call('mk_cleanTmp');
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pickBox.classList.contains('show')) closePick(); });
  pickBox.addEventListener('mousedown', function (e) { if (e.target === pickBox) closePick(); });
  document.getElementById('pickCenter').addEventListener('click', function () { opts.pivot = [0.5, 0.5]; snapX = snapY = true; placeDot(); paintPivot(); save(); applyPivot(); playPreview(); });
  document.getElementById('pickDone').addEventListener('click', function () { closePick(); status('✓ 기준점: ' + pivLabel.textContent, 'ok'); });

  /* ---------- 글자 영역 자동 측정 ---------- */
  var areaCache = {}, lastGrabErr = '';
  var autoAreaBtn = document.getElementById('optAutoArea');
  function paintAutoArea() { autoAreaBtn.classList.toggle('on', opts.autoArea !== false); }
  autoAreaBtn.addEventListener('click', function () { opts.autoArea = opts.autoArea === false; paintAutoArea(); save(); });
  /* 클립만 보이게 캡처해서 밝은 픽셀이 있는 범위를 % 로 */
  async function measureArea(clip, useBelow) {
    var tt = useBelow && clip.below >= 0 ? clip.below : clip.t;   /* 복제본용: 효과가 안 들어간 아래 원본을 잰다 */
    var key = clip.id + '|' + tt + '|' + (clip.text || clip.name) + '|' + clip.start + '|' + clip.end;
    if (areaCache[key]) return areaCache[key];
    var r = await call('mk_grabFrame', { t: tt, c: clip.c, isolate: true, at: clip.start + (clip.end - clip.start) * 0.8 });
    if (!r.ok) lastGrabErr = r.err + (r.msg ? ' (' + r.msg + ')' : '');
    var area = null;
    if (r.ok) {
      var im = await loadFrame(r.path);
      if (im) { area = bboxOf(im); if (area) area.ink = inkOf(im, area); }
      dropFrame(r.path);                     /* 잰 다음 바로 삭제 */
    }
    areaCache[key] = area;
    return area;
  }
  /* 글자 영역 안에서 세로 줄마다 글자 픽셀 양 (1000칸, 화면 가로 %) → 타이핑 경계를 실제 글자 틈에 맞출 때 씀 */
  function inkOf(im, a) {
    try {
      var W = Math.min(im.width || im.naturalWidth, 1920), H = Math.max(1, Math.round((im.height || im.naturalHeight) * W / (im.width || im.naturalWidth)));
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
      var y0 = Math.max(0, Math.floor(a.T / 100 * H)), y1 = Math.min(H, Math.ceil(a.B / 100 * H));
      var d = g.getImageData(0, y0, W, Math.max(1, y1 - y0)).data, rows = Math.max(1, y1 - y0), N = 1000, v = [], x, y;
      for (x = 0; x < N; x++) v.push(0);
      for (y = 0; y < rows; y++) for (x = 0; x < W; x++) {
        var i = (y * W + x) * 4;
        if (Math.max(d[i], d[i + 1], d[i + 2]) > 60 && d[i + 3] > 0) v[Math.min(N - 1, Math.floor(x / W * N))]++;
      }
      return { v: v };
    } catch (e) { return null; }
  }
  function bboxOf(im) {
    try {
      var W = 384, H = Math.max(1, Math.round(im.height * W / im.width));
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
      var d = g.getImageData(0, 0, W, H).data, x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var i = (y * W + x) * 4;
        if (Math.max(d[i], d[i + 1], d[i + 2]) > 60 && d[i + 3] > 0) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (n < 15) return null;
      return { L: x0 / W * 100, R: (x1 + 1) / W * 100, T: y0 / H * 100, B: (y1 + 1) / H * 100 };
    } catch (e) { return null; }
  }
  function areaText(a) { return a ? '가로 ' + Math.round(a.L) + '~' + Math.round(a.R) + '% · 세로 ' + Math.round(a.T) + '~' + Math.round(a.B) + '%' : '못 찾음'; }
  document.getElementById('btnMeasure').addEventListener('click', async function () {
    var c = await getCtx(true);
    if (!c.ok) return status(errText(c), 'err');
    if (!c.clips.length) return status('자막 클립을 먼저 선택하세요', 'warn');
    status('글자 영역을 재는 중…');
    var cl = c.clips[0]; delete areaCache[cl.id + '|' + (cl.text || cl.name) + '|' + cl.start + '|' + cl.end];
    var a = await measureArea(cl);
    call('mk_cleanTmp');
    status(a ? '✓ 글자 영역: ' + areaText(a) : '글자 영역을 못 찾았어요 (어두운 글자거나 캡처 불가) → 글자 폭/중심을 직접 맞춰주세요', a ? 'ok' : 'warn');
  });

  /* ---------- 차오를 색 ---------- */
  var colorsEl = document.getElementById('fillColors');
  var CNAME = { yellow: '노랑', red: '빨강', sky: '하늘', pink: '핑크', green: '초록', white: '흰색', black: '검정' };
  Object.keys(MK.FILL_COLORS).forEach(function (k) {
    var c = MK.FILL_COLORS[k], b = document.createElement('button'); b.title = CNAME[k] || k; b.dataset.v = k;
    b.style.background = 'rgb(' + c[1] + ',' + c[2] + ',' + c[3] + ')';
    b.addEventListener('click', function () { opts.fillColor = k; paintColors(); save(); });
    colorsEl.appendChild(b);
  });
  function paintColors() { colorsEl.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === (opts.fillColor || 'yellow')); }); }

  /* ---------- 사용법 팁 ---------- */
  var tipBox = document.getElementById('tipBox');
  function paintTip() { tipBox.classList.toggle('show', !S.tipOff); }
  document.getElementById('tipOff').addEventListener('click', function () { S.tipOff = true; paintTip(); save(); });

  /* ---------- 선택한 클립 수 (실시간) ---------- */
  var selChip = document.getElementById('selChip');
  async function pollSel() {
    if (document.hidden || isMini()) return;
    var r = await call('mk_selCount');
    if (!r.ok) return;
    selChip.textContent = !r.seq ? '시퀀스 없음' : '선택 ' + r.v + '개' + (r.a ? ' · 오디오 ' + r.a : '');
    selChip.classList.toggle('has', r.v + r.a > 0);
  }
  setInterval(pollSel, 1200);

  /* ---------- 미리보기 그리기 ---------- */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /* 화면(시퀀스 프레임)은 캔버스의 가운데 60% 영역 */
  /* 화면(16:9) 영역: 캔버스 가운데, 바깥 여백은 들어오고 나가는 움직임용 */
  function scr(g) {
    var W = g.canvas.width, H = g.canvas.height, sh = Math.min(H * 0.62, W * 0.6 * 9 / 16), sw = sh * 16 / 9;
    return { W: W, H: H, sw: sw, sh: sh, x0: (W - sw) / 2, y0: (H - sh) / 2 };
  }
  function drawContent(g, st, kind, text) {
    var R = scr(g), W = R.W, w = R.sw, h = R.sh;
    if (kind === 'typing') {
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var fs = h * 0.3; g.font = '700 ' + fs + 'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
      var tw = g.measureText(text).width; if (tw > w * 0.8) { fs *= w * 0.8 / tw; g.font = '700 ' + fs + 'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; }
      g.fillText(text, 0, 0);
    } else if (kind === 'text') {
      g.fillStyle = '#f2f2f2';
      roundRect(g, -w * 0.46, -h * 0.18, w * 0.92, h * 0.36, Math.max(2, W * 0.03)); g.fill();
      g.fillStyle = '#222'; g.fillRect(-w * 0.32, -h * 0.04, w * 0.64, h * 0.08);
    } else {
      var gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      gr.addColorStop(0, '#3b6fd6'); gr.addColorStop(1, '#8a5bd6');
      g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.beginPath(); g.arc(-w * 0.14, -h * 0.06, h * 0.17, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-w / 2, h * 0.22, w, h * 0.28);
    }
  }
  function drawFrame(g, st, kind, text, alpha, fi) {
    var R = scr(g), W = R.W, H = R.H, sw = R.sw, sh = R.sh, x0 = R.x0, y0 = R.y0;
    g.save();
    /* 자르기: 화면 기준 % */
    var c = st.crop;
    if (c[0] || c[1] || c[2] || c[3]) {
      g.beginPath();
      g.rect(x0 + sw * c[0] / 100, y0 + sh * c[1] / 100, sw * (1 - (c[0] + c[2]) / 100), sh * (1 - (c[1] + c[3]) / 100));
      g.clip();
    }
    var bl = (st.blur + st.dblur * 0.4) * sw / 1920, flt = [];
    if (bl > 0.15) flt.push('blur(' + bl.toFixed(2) + 'px)');
    if (st.bright) flt.push('brightness(' + (1 + st.bright / 60).toFixed(2) + ')');
    if (st.hue) flt.push('hue-rotate(' + Math.round(st.hue) + 'deg)');
    if (st.sat !== 100) flt.push('saturate(' + (st.sat / 100).toFixed(2) + ')');
    if (flt.length) g.filter = flt.join(' ');
    g.globalAlpha = alpha * Math.max(0, Math.min(1, st.op / 100));
    function place() {
      g.translate(W / 2 + st.pos[0] * sw, H / 2 + st.pos[1] * sh);
      g.rotate(st.rot * Math.PI / 180);
      g.scale(st.sw / 100, st.sh / 100);
    }
    if (st.turb > 1) {
      /* 난류 변위 흉내: 가로 띠마다 조금씩 어긋나게 */
      var bands = 6, amt = st.turb / 120 * sw * 0.08;
      for (var b = 0; b < bands; b++) {
        g.save();
        g.beginPath(); g.rect(0, H * b / bands, W, H / bands + 0.5); g.clip();
        g.translate(Math.sin((fi || 0) * 2.3 + b * 1.7) * amt, 0);
        place(); drawContent(g, st, kind, text);
        g.restore();
      }
    } else { place(); drawContent(g, st, kind, text); }
    g.restore();
    if (st.tint > 1) {      /* 색조(빨간 화면) 흉내 */
      g.save(); g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,40,30,' + (st.tint / 100 * 0.75).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
      g.restore();
    }
  }
  function drawScreen(g) {
    var R = scr(g), lw = Math.max(1, Math.round(R.H / 60));
    g.fillStyle = '#1b1b1b'; g.fillRect(R.x0, R.y0, R.sw, R.sh);
    g.strokeStyle = '#444'; g.lineWidth = lw; g.setLineDash([3 * lw, 3 * lw]);
    g.strokeRect(R.x0 + lw / 2, R.y0 + lw / 2, R.sw - lw, R.sh - lw);
    g.setLineDash([]);
  }
  function kindOf(preset, pv) { return pv.text ? 'typing' : (preset.cat === 'text' || preset.cat === 'caption') ? 'text' : 'video'; }
  function changed(a, b) {
    return a.pos[0] !== b.pos[0] || a.pos[1] !== b.pos[1] || a.sw !== b.sw || a.sh !== b.sh || a.rot !== b.rot || a.op !== b.op ||
      a.blur !== b.blur || a.dblur !== b.dblur || a.turb !== b.turb || a.crop.join() !== b.crop.join() ||
      a.tint !== b.tint || a.bright !== b.bright || a.hue !== b.hue;
  }
  /* 정지 상태: 움직임 구간을 겹쳐 그린 잔상 */
  function drawStill(cv, pv, kind) {
    var g = cv.getContext('2d'), frames = pv.frames, n = frames.length;
    g.clearRect(0, 0, cv.width, cv.height); drawScreen(g);
    var moving = [];
    for (var i = 1; i < n; i++) if (changed(frames[i - 1], frames[i])) moving.push(i);
    if (!moving.length) { drawFrame(g, frames[n - 1], kind, pv.text, 1, n - 1); return; }
    if (kind === 'typing' || moving.length > 0 && frames.some(function (f) { return f.turb > 1; })) {
      var mid = moving[Math.floor(moving.length * 0.6)];
      drawFrame(g, frames[mid], kind, pv.text, 1, mid); return;
    }
    var s = Math.max(0, moving[0] - 1), e = moving[moving.length - 1];
    for (var k = 0; k < 5; k++) {
      var idx = Math.round(s + (e - s) * k / 4);
      drawFrame(g, frames[idx], kind, pv.text, k === 4 ? 1 : 0.12 + k * 0.1, idx);
    }
    drawArrow(g, frames[s], frames[e]);
  }
  /* 위치 이동이 있으면 시작→끝 화살표로 방향을 한눈에 */
  function drawArrow(g, a, b) {
    var R = scr(g), dx = (b.pos[0] - a.pos[0]) * R.sw, dy = (b.pos[1] - a.pos[1]) * R.sh, L = Math.sqrt(dx * dx + dy * dy);
    if (L < R.sh * 0.18) return;
    var cx = R.W / 2, cy = R.H / 2, k = Math.min(1, R.sw * 0.42 / L), ux = dx / L, uy = dy / L;
    var x1 = cx - dx * k / 2, y1 = cy - dy * k / 2, x2 = cx + dx * k / 2, y2 = cy + dy * k / 2, hs = Math.max(4, R.H * 0.09);
    g.save(); g.strokeStyle = g.fillStyle = 'rgba(255,214,90,.95)'; g.lineWidth = Math.max(1.5, R.H / 40); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - ux * hs * 0.6, y2 - uy * hs * 0.6); g.stroke();
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - ux * hs - uy * hs * 0.6, y2 - uy * hs + ux * hs * 0.6);
    g.lineTo(x2 - ux * hs + uy * hs * 0.6, y2 - uy * hs - ux * hs * 0.6); g.closePath(); g.fill();
    g.restore();
  }
  var playing = null;
  function play(cv, pv, kind) {
    stop();
    var i = 0, g = cv.getContext('2d'), last = 0, hold = 0, frames = pv.frames;
    playing = { cv: cv, pv: pv, kind: kind, raf: 0 };
    function tick(ts) {
      if (!playing || playing.cv !== cv) return;
      if (ts - last >= 33) {
        last = ts;
        g.clearRect(0, 0, cv.width, cv.height); drawScreen(g); drawFrame(g, frames[i], kind, pv.text, 1, i);
        if (i < frames.length - 1) i++; else if (++hold > 12) { i = 0; hold = 0; }
      }
      playing.raf = requestAnimationFrame(tick);
    }
    playing.raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (!playing) return;
    cancelAnimationFrame(playing.raf);
    drawStill(playing.cv, playing.pv, playing.kind);
    playing = null;
  }

  /* ---------- 즐겨찾기 ---------- */
  function isFav(id) { return S.favs.indexOf(id) >= 0; }
  function toggleFav(id) {
    if (isFav(id)) S.favs = S.favs.filter(function (x) { return x !== id; }); else S.favs.push(id);
    save(); renderGrid(); renderMini();
  }

  /* ---------- 카테고리 + 프리셋 카드 ---------- */
  var catsEl = document.getElementById('cats'), gridEl = document.getElementById('grid'), typingOpts = document.getElementById('typingOpts');
  /* 카테고리 줄은 한 줄 고정 → 마우스 휠로 옆으로 넘기기 */
  catsEl.addEventListener('wheel', function (e) {
    if (catsEl.scrollWidth <= catsEl.clientWidth) return;
    e.preventDefault(); catsEl.scrollLeft += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
  }, { passive: false });
  function renderCats() {
    catsEl.innerHTML = '';
    [{ id: 'fav', label: '★' }, { id: 'all', label: '전체' }].concat(MK.CATS).forEach(function (c) {
      var b = document.createElement('button'); b.textContent = catLabel(c); b.dataset.v = c.id;
      if (c.id === 'fav') b.title = '즐겨찾기';
      b.classList.toggle('on', opts.cat === c.id);
      b.addEventListener('click', function () { opts.cat = c.id; save(); renderCats(); renderGrid(); var ms = document.getElementById('mScroll'); if (ms) ms.scrollTop = 0; });
      catsEl.appendChild(b);
    });
    typingOpts.classList.toggle('show', opts.cat === 'caption');
  }

  function durText(p) {
    var dv = MK.durationOf(p, opts);
    return dv === null ? '끝까지' : dv < 0.02 ? '즉시' : fmtSec(dv);
  }
  /* 카드 하나: 단일 효과 = 카드 전체 클릭 / 묶음 = 변형 버튼(가로 또는 십자) */
  function card(preset, members) {
    var g = members ? MK.GROUPS[preset.group] : null;
    var el = document.createElement(members ? 'div' : 'button');
    el.className = 'cardP' + (g && g.layout === 'dpad' ? ' dpad' : '');
    var cv = document.createElement('canvas'); cv.width = 216; cv.height = 96;
    var hd = document.createElement('div'); hd.className = 'hd';
    var nm = document.createElement('span'); nm.className = 'nm';
    var en = document.createElement('span'); en.className = 'en';
    var ds = document.createElement('div'); ds.className = 'ds';
    var bd = document.createElement('span'); bd.className = 'badge';
    hd.appendChild(nm); hd.appendChild(en);
    el.appendChild(cv); el.appendChild(bd); el.appendChild(hd); el.appendChild(ds);
    var first = members ? members[0] : preset;
    var pv = MK.preview(first, opts), kind = kindOf(first, pv);
    drawStill(cv, pv, kind);
    bd.textContent = durText(first) + (first.dup ? ' · 복제용' : '');
    if (members) {
      nm.textContent = gName(g); en.textContent = isEn() ? '' : (g.en || ''); ds.textContent = gDesc(preset.group, g);
      var box = document.createElement('div'); box.className = g.layout === 'dpad' ? 'pad' : 'vars';
      function vbtn(p) {
        var b = document.createElement('button'); b.className = 'vb' + (isFav(p.id) ? ' fav' : '');
        b.textContent = vOf(p); b.title = nameOf(p) + ' — ' + descOf(p) + '\n우클릭: 즐겨찾기' + (isFav(p.id) ? ' (★)' : '');
        var f = null;
        b.addEventListener('mouseenter', function () {
          f = f || MK.preview(p, opts); play(cv, f, kind);
          ds.textContent = descOf(p); bd.textContent = durText(p) + (p.dup ? ' · 복제용' : '');
        });
        b.addEventListener('click', function () { apply(p, el); });
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleFav(p.id); });
        return b;
      }
      if (g.layout === 'dpad') {
        ['', 'u', '', 'l', 'c', 'r', '', 'd', ''].forEach(function (pos, i) {
          var p = pos && members.filter(function (m) { return m.dir === pos; })[0];
          if (p) box.appendChild(vbtn(p));
          else {
            var sp = document.createElement('span'); sp.className = 'padc';
            if (i === 4 && g.center) sp.textContent = g.center;
            box.appendChild(sp);
          }
        });
      } else members.forEach(function (p) { box.appendChild(vbtn(p)); });
      el.appendChild(box);
      el.addEventListener('mouseleave', function () { stop(); ds.textContent = gDesc(preset.group, g); bd.textContent = durText(first) + (first.dup ? ' · 복제용' : ''); });
    } else {
      nm.textContent = nameOf(preset); en.textContent = opts.cat === 'fav' || isEn() ? '' : (preset.en || ''); ds.textContent = descOf(preset); el.title = descOf(preset);
      var star = document.createElement('span'); star.className = 'star' + (isFav(preset.id) ? ' on' : '');
      star.textContent = isFav(preset.id) ? '★' : '☆'; star.title = '즐겨찾기';
      star.addEventListener('click', function (e) { e.stopPropagation(); toggleFav(preset.id); });
      el.appendChild(star);
      el.addEventListener('mouseenter', function () { play(cv, pv, kind); });
      el.addEventListener('mouseleave', stop);
      el.addEventListener('click', function () { apply(preset, el); });
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleFav(preset.id); });
    }
    return el;
  }
  var CAT_DESC = { basic: '어떤 영상에나 쓰기 좋은 기본 모션', impact: '타격감 · 짧고 센 한 방', text: '자막에 잘 어울리는 움직임',
    caption: '타이핑 · 블러 · 와이프 같은 모션자막', fun: '상황 · 감정 연출' };
  function heading(text, small, cls) {
    var h = document.createElement('div'); h.className = cls || 'sechead';
    h.textContent = text;
    if (small) { var sm = document.createElement('small'); sm.textContent = small; h.appendChild(sm); }
    gridEl.appendChild(h);
  }
  /* 모션 검색 (한글/영문 이름·설명) */
  var mSearch = document.getElementById('mSearch'), mFind = mSearch ? mSearch.parentNode : null;
  function textOf(p) {
    var g = p.group ? MK.GROUPS[p.group] : null, en = MK.EN.P[p.id] || [];
    return [p.id, p.name, p.en, p.desc, p.v, en[0], en[1], g && g.name, g && g.en, g && g.desc, p.group && MK.EN.G[p.group]].join(' ').toLowerCase();
  }
  function hit(p, q) { return textOf(p).indexOf(q) >= 0; }
  if (mSearch) {
    mSearch.addEventListener('input', function () { mFind.classList.toggle('has', !!mSearch.value); renderGrid(); document.getElementById('mScroll').scrollTop = 0; });
    mSearch.addEventListener('keydown', function (e) { if (e.key === 'Escape') { mSearch.value = ''; mFind.classList.remove('has'); renderGrid(); } });
    document.getElementById('mSearchX').addEventListener('click', function () { mSearch.value = ''; mFind.classList.remove('has'); renderGrid(); mSearch.focus(); });
  }
  function renderGrid() {
    stop();
    gridEl.innerHTML = '';
    var q = mSearch ? mSearch.value.trim().toLowerCase() : '';
    zoomRow.style.display = q || ['basic', 'all', 'fav'].indexOf(opts.cat) >= 0 ? '' : 'none';
    if (q) {
      var shown = 0, gdone = {}, lc = '';
      MK.PRESETS.forEach(function (p) {
        if (opts.cat === 'fav' && !isFav(p.id)) return;
        if (p.group) {
          if (gdone[p.group]) return;
          var mem = MK.PRESETS.filter(function (x) { return x.group === p.group; });
          if (!mem.some(function (x) { return hit(x, q); })) return;
          gdone[p.group] = true;
          if (p.cat !== lc) { lc = p.cat; heading(catLabel(MK.CATS.filter(function (c) { return c.id === p.cat; })[0]), ''); }
          gridEl.appendChild(card(p, mem)); shown++;
        } else if (hit(p, q)) {
          if (p.cat !== lc) { lc = p.cat; heading(catLabel(MK.CATS.filter(function (c) { return c.id === p.cat; })[0]), ''); }
          gridEl.appendChild(card(p)); shown++;
        }
      });
      if (!shown) gridEl.innerHTML = '<p class="note">찾는 모션이 없어요</p>';
      return;
    }
    if (opts.cat === 'fav') {
      var favs = S.favs.map(MK.getPreset).filter(Boolean);
      if (!favs.length) { gridEl.innerHTML = '<p class="note">☆ 를 누르거나 변형 버튼을 우클릭해서 즐겨찾기를 추가하세요</p>'; return; }
      favs.forEach(function (p) { gridEl.appendChild(card(p)); });
      return;
    }
    var done = {}, lastCat = '', lastSub = '';
    MK.PRESETS.forEach(function (p) {
      if (opts.cat !== 'all' && p.cat !== opts.cat) return;
      if (opts.cat === 'all' && p.cat !== lastCat) {
        lastCat = p.cat; lastSub = '';
        heading(catLabel(MK.CATS.filter(function (c) { return c.id === p.cat; })[0]), isEn() ? MK.EN.CAT_DESC[p.cat] : CAT_DESC[p.cat]);
      }
      if (p.sub && p.sub !== lastSub) { lastSub = p.sub; heading('• ' + subLabel(p.sub), '', 'subhead'); }
      if (p.group) {
        if (done[p.group]) return;
        done[p.group] = true;
        gridEl.appendChild(card(p, MK.PRESETS.filter(function (x) { return x.group === p.group; })));
      } else gridEl.appendChild(card(p));
    });
  }

  /* ---------- 미니 도구창 ---------- */
  var miniGrid = document.getElementById('miniGrid');
  function renderMini() {
    if (!isMini()) return;
    stop();
    miniGrid.innerHTML = '';
    var list = S.favs.map(MK.getPreset).filter(Boolean);
    if (!list.length) {
      var p = document.createElement('div'); p.className = 'miniEmpty';
      p.textContent = '즐겨찾기가 없어요. 전체 패널에서 ☆ 를 눌러 추가하세요.';
      miniGrid.appendChild(p);
    }
    list.forEach(function (preset) {
      var t = document.createElement('button'); t.className = 'tile'; t.title = nameOf(preset) + ' — ' + descOf(preset);
      var cv = document.createElement('canvas'); cv.width = 64; cv.height = 36;
      var lb = document.createElement('span'); lb.textContent = nameOf(preset);
      t.appendChild(cv); t.appendChild(lb);
      var pv = MK.preview(preset, opts), kind = kindOf(preset, pv);
      drawStill(cv, pv, kind);
      t.addEventListener('mouseenter', function () { play(cv, pv, kind); });
      t.addEventListener('mouseleave', stop);
      t.addEventListener('click', function () { apply(preset, t); });
      dragTile(t, 'm:' + preset.id);
      miniGrid.appendChild(t);
    });
    S.fxFavs.forEach(function (f) {
      if (f.q) {
        var qt = document.createElement('button'); qt.className = 'tile fxTile quick'; qt.title = quickName(f.q) + ' — ' + QUICK_TIP;
        qt.innerHTML = '<b>' + (f.q === 'black' ? '■' : '◧') + '</b><span></span>'; qt.querySelector('span').textContent = quickName(f.q);
        qt.addEventListener('click', function () { insertLayer(f.q, qt); });
        dragTile(qt, 'f:0:' + f.n);
        miniGrid.appendChild(qt); return;
      }
      var t = document.createElement('button'); t.className = 'tile fxTile' + (f.a ? ' audio' : ''); t.title = (f.a ? '오디오 효과: ' : '효과: ') + f.n;
      t.innerHTML = '<b>' + (f.a ? '♪ FX' : 'FX') + '</b><span class="noTr"></span>'; t.querySelector('span').textContent = f.n;
      t.addEventListener('click', function () { addFx(f.n, !!f.a, t); });
      dragTile(t, 'f:' + (f.a ? 1 : 0) + ':' + f.n);
      miniGrid.appendChild(t);
    });
    var clr = document.createElement('button'); clr.className = 'tile clear'; clr.title = '선택 클립의 모션 효과 지우기';
    clr.innerHTML = '<b>⌫</b><span>효과 지우기</span>';
    clr.addEventListener('click', doClear);
    miniGrid.appendChild(clr);
    if (document.body.classList.contains('short')) {
      var more = document.createElement('button'); more.className = 'tile more'; more.textContent = '⤢';
      more.title = FORCE_MINI ? '전체 패널 열기' : '크게 펼치기';
      more.addEventListener('click', expandClick);
      miniGrid.appendChild(more);
    }
  }

  /* ---------- 미니 창: 끌어서 순서 바꾸기 ---------- */
  var dragKey = null;
  function dragTile(t, key) {
    t.draggable = true; t.dataset.k = key;
    t.addEventListener('dragstart', function (e) {
      dragKey = key; t.classList.add('dragging'); stop();
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); } catch (x) {}
    });
    t.addEventListener('dragend', function () {
      dragKey = null; t.classList.remove('dragging');
      miniGrid.querySelectorAll('.over').forEach(function (o) { o.classList.remove('over'); });
    });
    t.addEventListener('dragover', function (e) {
      if (!dragKey || dragKey === key || dragKey[0] !== key[0]) return;
      e.preventDefault(); t.classList.add('over');
    });
    t.addEventListener('dragleave', function () { t.classList.remove('over'); });
    t.addEventListener('drop', function (e) {
      e.preventDefault(); t.classList.remove('over');
      if (dragKey && dragKey !== key && dragKey[0] === key[0]) moveFav(dragKey, key);
    });
  }
  function moveFav(from, to) {
    var arr, idOf;
    if (from[0] === 'm') { arr = S.favs; idOf = function (x) { return 'm:' + x; }; }
    else { arr = S.fxFavs; idOf = function (x) { return 'f:' + (x.a ? 1 : 0) + ':' + x.n; }; }
    var a = -1, b = -1;
    arr.forEach(function (x, i) { if (idOf(x) === from) a = i; if (idOf(x) === to) b = i; });
    if (a < 0 || b < 0) return;
    var item = arr.splice(a, 1)[0];
    arr.splice(b, 0, item);
    if (from[0] === 'm') S.favs = arr.slice(); else S.fxFavs = arr.slice();
    save(); renderMini(); renderGrid(); renderFxFavs();
    status('✓ 순서를 바꿨어요', 'ok');
  }

  /* ---------- 프리셋 적용 ---------- */
  var busy = false;
  async function apply(preset, el) {
    if (busy) return;
    busy = true; el.classList.add('busy'); status('적용 중…');
    try {
      var ctx = await getCtx(true);
      if (!ctx.ok) return status(errText(ctx), 'err');
      if (!ctx.clips.length) return status('타임라인에서 클립을 먼저 선택하세요', 'warn');
      if (preset.typing && frameOn) { frameOn = false; paintTyping(); }
      var measured = 0;
      if (preset.needsArea && opts.autoArea !== false && !(preset.typing && opts.typing.width > 0)) {
        status('글자 영역을 재는 중…');
        for (var ci = 0; ci < ctx.clips.length; ci++) { var a = await measureArea(ctx.clips[ci], !!preset.dup && preset.dup !== 'below'); ctx.clips[ci].area = a; if (a) measured++; }
        call('mk_cleanTmp');
      }
      var plan = MK.buildPlan(preset, opts, ctx);
      var r = await call('mk_apply', plan);
      if (!r.ok) return status(errText(r), 'err');
      var extra = opts.dur > 0 ? ' · ' + fmtSec(opts.dur) : '';
      if (preset.typing && !(r.missing && r.missing.length)) {
        var src = MK.typingText(ctx.clips[0], opts.typing), lay = MK.typingLayout(src.text, ctx, opts.typing, ctx.clips[0].area);
        autoW = lay.auto; paintTyping();
        if (src.from === 'guess') {
          busy = false;
          return status(nameOf(preset) + ' 적용 · 자막 글자를 못 읽어서 "' + src.text + '"(' + lay.chars.length + '글자) 기준이에요 → 타이핑 설정 "문장"에 자막 내용을 넣어주세요', 'warn');
        }
        extra += ' · ' + lay.chars.length + '글자(' + SRC[src.from] + '), 폭 ' + Math.round(lay.width) + '%' + (lay.measured ? '(자동 측정)' : '') + (lay.snapped ? ' · 글자 경계 ' + lay.snapped + '곳 맞춤' : '');
      }
      if (r.failed && r.failed.length && r.failed[0] === 'nobelow' && !r.done) {
        status(nameOf(preset) + ' 은 원본 위에 복제본이 있어야 해요 → ' + DUP_HOW, 'warn');
      } else if (r.failed && r.failed.length) {
        status(nameOf(preset) + ' · ' + r.done + '개 완료, ' + r.failed.length + '개 실패 (' + (ERR[r.failed[0]] || r.failed[0]) + ')', 'warn');
      } else if (r.missing && r.missing.length) {
        status(nameOf(preset) + ' · ' + r.missing.map(function (m) { return FXNAME[m] || m; }).join(', ') + ' 효과를 못 찾았어요 → "진단 정보 복사"를 눌러 알려주세요', 'warn');
      } else if (r.notes && r.notes.indexOf('nodup') >= 0) {
        status('✓ ' + nameOf(preset) + ' 적용 · 그런데 아래에 원본이 없어서 글자가 색으로만 나타나요 → 원본이 남아 있게 하려면 ' + DUP_HOW, 'warn');
      } else {
        if (r.notes && r.notes.length) extra += ' · ' + r.notes.map(function (n) { return NOTES[n] || n; }).filter(Boolean).join(', ');
        if (preset.needsArea && !preset.typing && opts.autoArea !== false) extra += measured ? ' · 글자 영역 자동 측정' : ' · 글자 영역을 못 찾아 화면 전체 기준';
        if (preset.dup === 'below') extra += ' — 원본을 Alt+드래그로 아래 트랙에 복사한 뒤, 아래 클립에 쓰는 효과예요';
        else if (preset.group === 'fill') extra += ' · 아래 원본 위에 색이 차올라요';
        else if (preset.dup) extra += ' — 원본을 Alt+드래그로 위 트랙에 복사한 뒤, 위 클립에 쓰는 효과예요';
        status('✓ ' + nameOf(preset) + ' 적용 · 클립 ' + r.done + '개' + extra, 'ok');
      }
    } finally { busy = false; el.classList.remove('busy'); }
  }

  document.getElementById('btnClear').addEventListener('click', doClear);

  /* ---------- 효과 탭 ---------- */
  var fxData = null, fxKind = 'video', fxLoading = false;
  var fxListEl = document.getElementById('fxList'), fxFavsEl = document.getElementById('fxFavs'),
      fxSearch = document.getElementById('fxSearch'), fxCount = document.getElementById('fxCount');
  function uniqSort(a) {
    var seen = {}, out = [];
    (a || []).forEach(function (n) { n = String(n).trim(); if (n && !seen[n]) { seen[n] = 1; out.push(n); } });
    return out.sort(function (x, y) { return x.localeCompare(y, 'ko'); });
  }
  async function loadFx(force) {
    if (fxData && !force) return fxData;
    if (fxLoading) return null;
    fxLoading = true;
    try {
      var r = await call('mk_fxList');
      if (!r.ok) { status(errText(r), 'err'); return null; }
      fxData = { video: uniqSort(r.video), audio: uniqSort(r.audio) };
      return fxData;
    } finally { fxLoading = false; }
  }
  /* 빠르게 넣기(조정 레이어 · 검은 화면): 효과 즐겨찾기와 같은 목록에 { n: '@adjust', q: 'adjust' } 로 저장 */
  var QUICK = [{ q: 'adjust', name: '조정 레이어', sh: '조정' }, { q: 'black', name: '검은 화면', sh: '검정' }];
  function quickName(q) { for (var i = 0; i < QUICK.length; i++) if (QUICK[i].q === q) return QUICK[i].name; return q; }
  var QUICK_TIP = '선택한 클립 길이에 맞춰, 다른 클립과 겹치지 않게 위쪽 빈 트랙에 넣어요 (빈 트랙이 없으면 트랙을 추가) · 선택이 없으면 재생헤드부터 5초';
  function isQuickFav(q) { return S.fxFavs.some(function (f) { return f.q === q; }); }
  function toggleQuickFav(q) {
    if (isQuickFav(q)) S.fxFavs = S.fxFavs.filter(function (f) { return f.q !== q; });
    else S.fxFavs.push({ n: '@' + q, q: q });
    save(); renderFxFavs(); renderMini();
  }
  function renderQuick() {
    var el = document.getElementById('quickMini'); if (!el) return;
    el.innerHTML = '';
    QUICK.forEach(function (it) {
      var b = document.createElement('button'); b.className = 'qChip';
      b.title = QUICK_TIP + '\n☆: 즐겨찾기 (미니 패널에도 나와요)';
      var st = document.createElement('i'); st.className = 'qStar' + (isQuickFav(it.q) ? ' on' : ''); st.textContent = isQuickFav(it.q) ? '★' : '☆';
      var nm = document.createElement('span'); nm.innerHTML = '<em class="lg"></em><em class="sh"></em>';
      nm.firstChild.textContent = '＋ ' + it.name; nm.lastChild.textContent = '＋ ' + it.sh;
      b.appendChild(nm); b.appendChild(st);
      b.addEventListener('click', function (e) { if (e.target === st) { toggleQuickFav(it.q); return; } insertLayer(it.q, b); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleQuickFav(it.q); });
      el.appendChild(b);
    });
  }
  function isFxFav(n, a) { return S.fxFavs.some(function (f) { return f.n === n && !!f.a === !!a; }); }
  function toggleFxFav(n, a) {
    if (isFxFav(n, a)) S.fxFavs = S.fxFavs.filter(function (f) { return !(f.n === n && !!f.a === !!a); });
    else S.fxFavs.push({ n: n, a: !!a });
    save(); renderFxFavs(); renderFxList(); renderMini();
  }
  function renderFxFavs() {
    renderQuick();
    fxFavsEl.innerHTML = '';
    if (!S.fxFavs.length) { fxFavsEl.innerHTML = '<span class="empty">아래 목록이나 위 빠르게 넣기의 ☆ 를 눌러 추가하세요</span>'; return; }
    S.fxFavs.forEach(function (f) {
      if (f.q) {
        var qb = document.createElement('button'); qb.className = 'fxChip quick'; qb.textContent = '＋ ' + quickName(f.q);
        qb.title = QUICK_TIP + '\n우클릭: 즐겨찾기 빼기';
        qb.addEventListener('click', function () { insertLayer(f.q, qb); });
        qb.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleQuickFav(f.q); });
        fxFavsEl.appendChild(qb); return;
      }
      var b = document.createElement('button'); b.className = 'fxChip noTr' + (f.a ? ' audio' : ''); b.textContent = f.n;
      b.title = (f.a ? '오디오 효과 · ' : '') + '클릭: 추가 / 우클릭: 즐겨찾기 빼기';
      b.addEventListener('click', function () { addFx(f.n, !!f.a, b); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleFxFav(f.n, f.a); });
      fxFavsEl.appendChild(b);
    });
  }
  function renderFxList() {
    if (!fxData) return;
    var q = fxSearch.value.trim().toLowerCase(), all = fxData[fxKind], audio = fxKind === 'audio';
    var list = all.filter(function (n) { return !q || n.toLowerCase().indexOf(q) >= 0; });
    fxCount.textContent = list.length + ' / ' + all.length + '개';
    fxListEl.innerHTML = '';
    if (!list.length) { fxListEl.innerHTML = '<p class="note">찾는 효과가 없어요</p>'; return; }
    list.slice(0, 400).forEach(function (n) {
      var row = document.createElement('div'); row.className = 'fxRow';
      var st = document.createElement('button'); st.className = 'st' + (isFxFav(n, audio) ? ' on' : ''); st.textContent = isFxFav(n, audio) ? '★' : '☆';
      st.title = '즐겨찾기'; st.addEventListener('click', function () { toggleFxFav(n, audio); });
      var nm = document.createElement('button'); nm.className = 'nm noTr'; nm.textContent = n; nm.title = '선택한 ' + (audio ? '오디오 ' : '') + '클립에 추가';
      nm.addEventListener('click', function () { addFx(n, audio, nm); });
      row.appendChild(st); row.appendChild(nm); fxListEl.appendChild(row);
    });
  }
  async function openFxTab() {
    renderFxFavs();
    if (!fxData) { fxListEl.innerHTML = '<p class="note">목록을 불러오는 중…</p>'; await loadFx(); }
    renderFxList();
  }
  fxSearch.addEventListener('input', renderFxList);
  seg(document.getElementById('fxKind'), null, null, function () { return fxKind; }, function (v) { fxKind = v; renderFxList(); });
  async function addFx(name, audio, el) {
    if (el) el.classList.add('busy');
    try {
      var r = await call('mk_addEffect', { name: name, audio: !!audio });
      if (!r.ok) return status(r.err === 'nofx' ? '"' + name + '" 효과를 찾지 못했어요' : errText(r), 'err');
      if (!r.clips) return status('타임라인에서 ' + (audio ? '오디오 ' : '') + '클립을 먼저 선택하세요', 'warn');
      status(r.done ? '✓ ' + name + ' 추가 · 클립 ' + r.done + '개' : name + ' 을(를) 추가하지 못했어요', r.done ? 'ok' : 'warn');
    } finally { if (el) el.classList.remove('busy'); }
  }

  /* ---------- 새로고침 ---------- */
  document.getElementById('btnReload').addEventListener('click', function () { flush(); setTimeout(function () { location.reload(); }, 300); });

  /* ---------- 진단 정보 복사 ---------- */
  var diagBox = document.getElementById('diagBox'), diagText = document.getElementById('diagText');
  document.getElementById('btnDiag').addEventListener('click', async function () {
    status('진단 중…');
    var r = await call('mk_diag');
    var head = 'Moment_Motion Kit ' + VERSION + ' (' + RUN.src + ')' + (lastGrabErr ? '\nlast capture error: ' + lastGrabErr : '') + (connErr ? '\nconnection: ' + connErr : '') +
      '\npanel: ' + navigator.userAgent.replace(/^.*?(Chrome\/[\d.]+).*$/, '$1') + ' · ' + (navigator.platform || '') + '\n';
    diagText.value = head + (r.ok ? r.text : '진단 실패: ' + errText(r));
    diagBox.classList.add('show');
    diagText.focus(); diagText.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (e) {}
    status(copied ? '✓ 진단 정보를 복사했어요. 채팅에 붙여넣어 주세요' : '아래 내용을 전체 선택(Ctrl+A) 후 복사해 주세요', copied ? 'ok' : 'warn');
  });
  document.getElementById('diagClose').addEventListener('click', function () { diagBox.classList.remove('show'); });
  async function doClear() {
    if (frameOn) { frameOn = false; paintTyping(); }
    var r = await call('mk_clear');
    if (!r.ok) return status(errText(r), 'err');
    if (!r.clips) return status('타임라인에서 클립을 먼저 선택하세요', 'warn');
    if (!r.removed && !r.reset) return status('선택한 클립에 지울 모션 효과가 없어요', 'warn');
    status(r.removed ? '✓ 모션 효과 ' + r.removed + '개 삭제' : '✓ 변형 효과 값을 초기화했어요', 'ok');
  }

  /* ---------- 커브 편집기 (Super Pad 방식 참고: 곡선 버튼 · All/골라서 · Linear · 뒤집기 · 모션블러) ---------- */
  var cv = document.getElementById('cv'), g = cv.getContext('2d');
  var readout = document.getElementById('readout'), ball = document.getElementById('ball');
  var BOX = { x: 60, y: 90, w: 480, h: 240 };       // 0~1 영역 (위아래로 오버슈트 여유)
  function toPx(x, y) { return [BOX.x + x * BOX.w, BOX.y + (1 - y) * BOX.h]; }
  function fromPx(px, py) { return [(px - BOX.x) / BOX.w, 1 - (py - BOX.y) / BOX.h]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function cloneCurve(c) { return JSON.parse(JSON.stringify(c)); }
  function curveName(c) {
    for (var i = 0; i < MK.CURVES.length; i++) if (MK.sameCurve(MK.CURVES[i].c, c)) return isEn() ? MK.CURVES[i].en : MK.CURVES[i].name;
    for (var j = 0; j < S.mine.length; j++) if (MK.sameCurve(S.mine[j].c, c)) return S.mine[j].name;
    return '';
  }
  var hoverCurve = null;
  /* 곡선 모양을 작은 그림으로 */
  function drawThumb(c2, curve, on) {
    var gg = c2.getContext('2d'), W = c2.width, H = c2.height, pad = 6, lo = -0.3, hi = 1.3;
    gg.clearRect(0, 0, W, H);
    var X = function (x) { return pad + x * (W - pad * 2); }, Y = function (y) { return pad + (hi - y) / (hi - lo) * (H - pad * 2); };
    gg.strokeStyle = '#333'; gg.lineWidth = 1; gg.setLineDash([2, 2]);
    gg.beginPath(); gg.moveTo(X(0), Y(0)); gg.lineTo(X(1), Y(0)); gg.moveTo(X(0), Y(1)); gg.lineTo(X(1), Y(1)); gg.stroke(); gg.setLineDash([]);
    gg.strokeStyle = on ? '#fff' : '#4f9cff'; gg.lineWidth = 2; gg.beginPath();
    MK.curveSamples(curve, 40).forEach(function (p, i) { if (i) gg.lineTo(X(p[0]), Y(p[1])); else gg.moveTo(X(p[0]), Y(p[1])); });
    gg.stroke();
  }
  function drawCurve() {
    var curve = hoverCurve || S.curve, shape = MK.isShape(curve);
    g.clearRect(0, 0, cv.width, cv.height);
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var a = toPx(i / 4, 0), b = toPx(i / 4, 1), c = toPx(0, i / 4), d = toPx(1, i / 4);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.stroke();
    }
    var p0 = toPx(0, 0), p3 = toPx(1, 1);
    if (shape) {
      g.strokeStyle = '#4f9cff'; g.lineWidth = 4; g.beginPath();
      MK.curveSamples(curve, 120).forEach(function (p, k) { var q = toPx(p[0], p[1]); if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
      g.stroke();
    } else {
      var p1 = toPx(curve[0], curve[1]), p2 = toPx(curve[2], curve[3]);
      g.strokeStyle = '#555'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.moveTo(p3[0], p3[1]); g.lineTo(p2[0], p2[1]); g.stroke();
      g.strokeStyle = '#4f9cff'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); g.stroke();
      if (!hoverCurve) [p1, p2].forEach(function (p) { g.fillStyle = '#fff'; g.beginPath(); g.arc(p[0], p[1], 11, 0, Math.PI * 2); g.fill(); });
    }
    [p0, p3].forEach(function (p) { g.fillStyle = '#4f9cff'; g.beginPath(); g.arc(p[0], p[1], 6, 0, Math.PI * 2); g.fill(); });
    var nm = curveName(curve);
    readout.textContent = (nm ? nm + ' · ' : '') + (shape ? (isEn() ? 'fixed shape' : '모양 고정 곡선') + (curve.rev ? ' (⇄)' : '') : 'cubic-bezier(' + curve.map(function (v) { return v.toFixed(2); }).join(', ') + ')');
    paintCurveChips();
  }
  var drag = -1;
  function evtPos(e) {
    var r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  }
  cv.addEventListener('pointerdown', function (e) {
    var curve = S.curve;
    if (MK.isShape(curve)) { status('이 곡선은 모양이 정해져 있어요 → 손잡이로 바꾸려면 다른 곡선을 먼저 고르세요', 'warn'); return; }
    var p = evtPos(e), h1 = toPx(curve[0], curve[1]), h2 = toPx(curve[2], curve[3]);
    var d1 = Math.hypot(p[0] - h1[0], p[1] - h1[1]), d2 = Math.hypot(p[0] - h2[0], p[1] - h2[1]);
    drag = d1 < d2 ? 0 : 2;
    if (Math.min(d1, d2) > 60) { drag = -1; return; }
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', function (e) {
    if (drag < 0) return;
    var v = fromPx.apply(null, evtPos(e));
    S.curve[drag] = Math.round(clamp(v[0], 0, 1) * 100) / 100;
    S.curve[drag + 1] = Math.round(clamp(v[1], -0.35, 1.35) * 100) / 100;
    drawCurve();
  });
  cv.addEventListener('pointerup', function () { if (drag >= 0) { drag = -1; save(); } });
  document.getElementById('btnRev').addEventListener('click', function () { S.curve = MK.reverseCurve(S.curve); save(); drawCurve(); });

  /* 공 미리보기 (곡선 위에 마우스를 올리면 그 곡선으로) */
  var t0 = 0;
  function anim(ts) {
    if (!t0) t0 = ts;
    if (document.getElementById('tab-curve').classList.contains('on') && !isMini()) {
      var cyc = ((ts - t0) % 1600) / 1000, x = Math.min(1, cyc / 0.9);
      var y = MK.easeFn(hoverCurve || S.curve)(x);
      var track = ball.parentNode.clientWidth - 14;
      ball.style.transform = 'translateX(' + (y * track) + 'px)';
    }
    requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);

  var listEl = document.getElementById('curveList');
  function renderCurveChips() {
    listEl.innerHTML = '';
    MK.CURVES.map(function (c) { return { name: isEn() ? c.en : c.name, desc: c.desc, c: c.c }; })
      .concat(S.mine.map(function (m, i) { return { name: m.name, c: m.c, mine: i }; }))
      .forEach(function (c) {
        var b = document.createElement('button'); b.className = 'curveItem' + (c.mine !== undefined ? ' mine' : '');
        var cvs = document.createElement('canvas'); cvs.width = 72; cvs.height = 44;
        var nm = document.createElement('span'); nm.textContent = c.name; if (c.mine !== undefined) nm.className = 'noTr';
        b.appendChild(cvs); b.appendChild(nm); b._c = c.c; b._cv = cvs;
        b.title = (c.desc ? c.desc : c.name) + (c.mine !== undefined ? '\n우클릭: 삭제' : '');
        drawThumb(cvs, c.c, false);
        b.addEventListener('click', function () { hoverCurve = null; S.curve = cloneCurve(c.c); save(); drawCurve(); });
        b.addEventListener('mouseenter', function () { hoverCurve = c.c; t0 = 0; drawCurve(); });
        b.addEventListener('mouseleave', function () { hoverCurve = null; drawCurve(); });
        if (c.mine !== undefined) b.addEventListener('contextmenu', function (e) {
          e.preventDefault(); S.mine.splice(c.mine, 1); save(); renderCurveChips(); paintCurveChips();
        });
        listEl.appendChild(b);
      });
  }
  function paintCurveChips() {
    listEl.querySelectorAll('.curveItem').forEach(function (b) {
      var on = MK.sameCurve(b._c, S.curve);
      if (b.classList.contains('on') !== on) { b.classList.toggle('on', on); drawThumb(b._cv, b._c, on); }
    });
  }
  document.getElementById('btnSave').addEventListener('click', function () {
    var inp = document.getElementById('saveName'), name = inp.value.trim();
    if (!name) { inp.focus(); return status('곡선 이름을 입력하세요', 'warn'); }
    if (S.mine.length >= 50) return status('내 곡선은 50개까지 저장할 수 있어요 → 안 쓰는 곡선을 우클릭해서 지워주세요', 'warn');
    S.mine.push({ name: name, c: cloneCurve(S.curve) }); save();
    inp.value = ''; renderCurveChips(); paintCurveChips(); status('✓ 곡선 "' + name + '" 저장', 'ok');
  });

  /* 대상 칩 (All 일 때만) */
  var kindsEl = document.getElementById('kinds');
  function paintKinds() { kindsEl.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', !!opts.kinds[b.dataset.v]); }); }
  function paintKindsRow() { var r = document.getElementById('kindsRow'); if (r) r.style.display = opts.curveAll === false ? 'none' : ''; }
  kindsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    opts.kinds[b.dataset.v] = !opts.kinds[b.dataset.v]; paintKinds(); save();
  });

  /* 곡선 적용 / Linear — 원래 키프레임은 패널이 열려 있는 동안 기억 */
  var snaps = {};
  async function writeCurve(read, pick) {
    var writes = MK.bakeCurve(read, S.curve, opts.step, opts.curveAll === false ? null : opts.kinds, snaps, 'all', pick);
    if (!writes.length) return status('선택한 대상에 키프레임이 2개 이상인 속성이 없어요', 'warn');
    status('곡선 적용 중…');
    var r = await call('mk_writeKeys', writes);
    if (!r.ok) return status(errText(r), 'err');
    status('✓ 곡선 적용 · ' + (curveName(S.curve) || '') + ' · 속성 ' + r.done + '개', 'ok');
  }
  /* 골라서: 속성과 구간 고르기 창 */
  var segBox = document.getElementById('segBox'), segList = document.getElementById('segList'), segRead = null;
  function fmtT(ticks, speed) { return (ticks / 254016000000 / (speed || 1)).toFixed(2) + '초'; }
  function openSegs(read) {
    segRead = read; segList.innerHTML = '';
    var n = 0, only = null;
    read.clips.forEach(function (clip) {
      clip.params.forEach(function (prm) {
        if (prm.keys.length < 2 || typeof prm.keys[0][1] === 'object' && prm.keys[0][1] === null) return;
        var row = document.createElement('div'); row.className = 'segRow';
        var nm = document.createElement('div'); nm.className = 'segName';
        nm.innerHTML = '<b></b><small></small>';
        nm.querySelector('b').textContent = (prm.cn || '') + ' › ' + (prm.pn || prm.kind);
        nm.querySelector('small').textContent = read.clips.length > 1 ? (clip.name || '') : '';
        nm.querySelector('b').className = 'noTr';
        var chips = document.createElement('div'); chips.className = 'segChips';
        for (var i = 0; i < prm.keys.length - 1; i++) {
          var b = document.createElement('button'); b.className = 'segChip on';
          b.dataset.key = clip.id + '|' + prm.ci + '|' + prm.pi; b.dataset.i = i;
          b.dataset.a = prm.keys[i][0]; b.dataset.b = prm.keys[i + 1][0]; b.dataset.ph = clip.ph;
          b.textContent = (i + 1) + '→' + (i + 2) + ' · ' + fmtT(prm.keys[i + 1][0] - prm.keys[i][0], clip.speed);
          b.addEventListener('click', function () { this.classList.toggle('on'); });
          chips.appendChild(b); n++; only = b;
        }
        row.appendChild(nm); row.appendChild(chips); segList.appendChild(row);
      });
    });
    if (!n) return status('선택한 클립에 키프레임이 2개 이상인 속성이 없어요', 'warn');
    if (n === 1) { var pk = {}; pk[only.dataset.key] = [0]; return writeCurve(read, pk); }   /* 하나뿐이면 바로 적용 */
    segBox.classList.add('show');
    status('곡선을 넣을 구간을 고르고 적용을 누르세요', 'ok');
  }
  function segChips() { return segList.querySelectorAll('.segChip'); }
  document.getElementById('segAll').addEventListener('click', function () { segChips().forEach(function (b) { b.classList.add('on'); }); });
  document.getElementById('segNone').addEventListener('click', function () { segChips().forEach(function (b) { b.classList.remove('on'); }); });
  document.getElementById('segPh').addEventListener('click', function () {
    segChips().forEach(function (b) { var ph = +b.dataset.ph; b.classList.toggle('on', ph >= +b.dataset.a && ph < +b.dataset.b); });
  });
  document.getElementById('segCancel').addEventListener('click', function () { segBox.classList.remove('show'); });
  segBox.addEventListener('mousedown', function (e) { if (e.target === segBox) segBox.classList.remove('show'); });
  document.getElementById('segApply').addEventListener('click', function () {
    var pk = {}, n = 0;
    segChips().forEach(function (b) { if (!b.classList.contains('on')) return; (pk[b.dataset.key] = pk[b.dataset.key] || []).push(+b.dataset.i); n++; });
    if (!n) return status('구간을 하나 이상 고르세요', 'warn');
    segBox.classList.remove('show');
    writeCurve(segRead, pk);
  });
  document.getElementById('btnCurve').addEventListener('click', async function () {
    var read = await call('mk_readKeys');
    if (!read.ok) return status(errText(read), 'err');
    if (!read.clips.length) return status('타임라인에서 클립을 먼저 선택하세요', 'warn');
    if (opts.curveAll === false) return openSegs(read);
    writeCurve(read, null);
  });
  document.getElementById('btnRestore').addEventListener('click', async function () {
    var read = await call('mk_readKeys');
    if (!read.ok) return status(errText(read), 'err');
    var writes = MK.restoreCurve(read, snaps);
    if (!writes.length) return status('되돌릴 곡선 기록이 없어요 (패널을 다시 열면 기록이 사라져요)', 'warn');
    var r = await call('mk_writeKeys', writes);
    if (!r.ok) return status(errText(r), 'err');
    status('✓ Linear · 원래 키프레임으로 되돌림 · 속성 ' + r.done + '개', 'ok');
  });
  /* 모션블러: 모션 애니메이션 → 변형 효과 + 셔터 180° */
  var BLUR_SKIP = { nokeys: '움직임(키프레임)이 없음', hastf: '이미 변형 효과에 키프레임이 있음', size: '영상 크기가 시퀀스와 달라서 옮기면 화면이 바뀜',
    'static': '모션 위치·크기를 고정값으로 바꿔 둔 클립', notf: '변형 효과를 추가하지 못함' };
  document.getElementById('btnBlur').addEventListener('click', async function () {
    var r = await call('mk_motionBlur', { shutter: 180 });
    if (!r.ok) return status(errText(r), 'err');
    if (!r.clips) return status('타임라인에서 클립을 먼저 선택하세요', 'warn');
    var msg = [];
    if (r.moved) msg.push('모션 → 변형 효과로 옮기고 블러 ' + r.moved + '개');
    if (r.blurred) msg.push('블러 켬 ' + r.blurred + '개');
    var why = {}; (r.skipped || []).forEach(function (k) { why[k] = (why[k] || 0) + 1; });
    var sk = Object.keys(why).map(function (k) { return (BLUR_SKIP[k] || k) + ' ' + why[k] + '개'; });
    if (!msg.length) return status('모션블러를 넣지 못했어요 · ' + sk.join(', '), 'warn');
    status('✓ ' + msg.join(' · ') + (sk.length ? ' · 건너뜀: ' + sk.join(', ') : ''), sk.length ? 'warn' : 'ok');
  });

  /* ---------- 빠르게 넣기: 조정 레이어 / 검은 화면 ---------- */
  async function blackPng() {
    var p = await call('mk_paths');
    if (!p.ok) return null;
    var path = p.dir.replace(/\\/g, '/') + '/mmk_black_' + p.w + 'x' + p.h + '.png';
    try {
      var CF = window.cep;
      if (CF && CF.fs) {
        var st = CF.fs.stat ? CF.fs.stat(path) : { err: 1 };
        if (!st || st.err !== 0) {
          var c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
          var gg = c.getContext('2d'); gg.fillStyle = '#000'; gg.fillRect(0, 0, p.w, p.h);
          CF.fs.writeFile(path, c.toDataURL('image/png').split(',')[1], CF.encoding ? CF.encoding.Base64 : 'Base64');
        }
      }
    } catch (e) {}
    return path;
  }
  async function insertLayer(kind, btn) {
    if (btn.classList.contains('busy')) return;
    btn.classList.add('busy');
    try {
      var data = { kind: kind, dur: 5 };
      if (kind === 'black') { data.png = await blackPng(); if (!data.png) return status('검은 화면 그림을 만들지 못했어요', 'err'); }
      status(kind === 'black' ? '검은 화면 넣는 중…' : '조정 레이어 넣는 중…');
      var r = await call('mk_insertLayer', data);
      if (!r.ok) {
        if (r.err === 'noadjust') return status('프로젝트에 조정 레이어가 없어요 → 프로젝트 패널 › 새 항목 › 조정 레이어를 한 번 만들어 두면, 다음부터 이 버튼이 그걸 써서 넣어요', 'warn');
        if (r.err === 'import') return status('검은 화면 그림을 가져오지 못했어요 → "진단 정보 복사"를 눌러 알려주세요', 'err');
        return status(errText(r), 'err');
      }
      var name = kind === 'black' ? '검은 화면' : '조정 레이어';
      if (!r.done) return status(name + '을(를) 넣지 못했어요 (' + (r.fails || []).join(', ') + ')', 'warn');
      status('✓ ' + name + ' ' + r.done + '개 · V' + r.tracks.join(', V') + (isEn() ? ' track' : ' 트랙'), 'ok');
    } finally { btn.classList.remove('busy'); }
  }

  /* ---------- 트래킹 탭 ----------
   * 화면을 프레임마다 캡처해서 패널 안에서 직접 추적(MKTrack, engine.js 맨 아래)하고,
   * 결과를 선택한 클립의 키프레임으로 적는다.
   *   따라가기  : 선택한 클립(자막·이미지)이 화면 속 대상을 따라감 → 모션(또는 변형) 위치·비율·회전
   *   고정      : 선택한 영상에서 대상이 멈춰 보이게 반대로 움직임 → 변형 효과 (기준점 키프레임)
   *   화면 합성 : 선택한 클립을 화면 속 네 모서리에 붙임 → 모퉁이 고정
   */
  var TRK = window.MKTrack;
  var TRK_MAXFRAMES = 1500, TRK_SIDE = 960;
  var TRK_HELP = {
    follow: '붙일 클립(자막·이미지·영상)을 선택 → 화면에서 따라갈 대상을 네모로 지정하면, 선택한 클립이 그 대상을 따라 움직여요.',
    stab: '흔들리는 영상 클립을 선택 → 멈춰 보이게 할 대상을 네모로 지정하면, 그 대상이 제자리에 있도록 영상을 반대로 움직여요.',
    pin: '끼워 넣을 클립(위 트랙의 영상·이미지)을 선택 → 아래 화면의 모니터·휴대폰 네 모서리를 지정하면, 선택한 클립이 그 화면에 붙어요.'
  };
  var TRK_TITLE = { follow: '따라갈 대상 지정', stab: '고정할 대상 지정', pin: '화면의 네 모서리 지정' };
  var TRK_MODE = { follow: '따라가기', stab: '고정', pin: '화면 합성' };
  var TRK_ERR = { noexport: '이 프리미어에서는 화면 캡처를 쓸 수 없어요', noframe: '화면을 캡처하지 못했어요', load: '캡처한 화면을 불러오지 못했어요',
    pixels: '캡처한 화면을 읽지 못했어요', nomotion: '모션 속성을 찾지 못했어요', nocpin: '모퉁이 고정(Corner Pin) 효과를 추가하지 못했어요',
    tfprops: '변형(Transform) 효과의 속성이 예상과 달라요', noparam: '속성을 찾지 못했어요', clip: '클립을 찾지 못했어요' };
  function trkErr(r) { return TRK_ERR[r.err] ? TRK_ERR[r.err] + (r.msg ? ' (' + r.msg + ')' : '') : errText(r); }
  function T_() { return opts.trk; }

  var trkBox = document.getElementById('trkBox'), trkCv = document.getElementById('trkCv'), trkG = trkCv.getContext('2d');
  var trkTitle = document.getElementById('trkTitle'), trkSub = document.getElementById('trkSub'), trkRead = document.getElementById('trkRead');
  var trkGo = document.getElementById('trkGo'), trkCancel = document.getElementById('trkCancel'), trkProg = document.getElementById('trkProg');
  var trkInfo = document.getElementById('trkInfo'), trkHelp = document.getElementById('trkHelp'), trkCard = document.querySelector('.trkCard');
  var trkSmooth = document.getElementById('trkSmooth'), trkSmoothVal = document.getElementById('trkSmoothVal');
  var trkBlurBtn = document.getElementById('trkBlur'), trkBlurHint = document.getElementById('trkBlurHint'), trkUse = document.getElementById('trkUse');
  var trkSes = null;     /* 지금 열려 있는 추적 창: { ctx, clip, f0, f1, fr, tpf, mode, step, gray, shot, aw, ah, poly, running, stop } */
  var trkData = null;    /* 마지막 추적 결과: { mode, model, frames:[프레임 번호], res:[...], refIdx, tpf, aw, ah, conf } */
  var trkBusy = false;

  seg(document.getElementById('trkMode'), null, null, function () { return T_().mode; }, function (v) { T_().mode = v; paintTrk(); });
  seg(document.getElementById('trkRange'), null, null, function () { return T_().range; }, function (v) { T_().range = v; });
  seg(document.getElementById('trkStep'), null, null, function () { return T_().step; }, function (v) { T_().step = +v; });
  seg(document.getElementById('trkZoom'), null, null, function () { return T_().zoom; }, function (v) { T_().zoom = +v; });
  trkUse.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    T_()[b.dataset.v] = !T_()[b.dataset.v];
    if (T_().mode === 'stab') T_().pos = true;       /* 고정은 위치가 항상 들어감 */
    paintTrk(); save();
  });
  trkSmooth.addEventListener('input', function () { T_().smooth = +trkSmooth.value; paintTrk(); });
  trkSmooth.addEventListener('change', function () { save(); });
  trkBlurBtn.addEventListener('click', function () { T_().blur = !T_().blur; paintTrk(); save(); });

  function trkInfoText() {
    if (!trkData) return '아직 없음';
    var n = trkData.frames.length, sec = (trkData.frames[n - 1] - trkData.frames[0] + 1) * trkData.tpf / 254016000000;
    return TRK_MODE[trkData.mode] + ' · ' + n + '프레임 (' + fmtSec(sec) + ') · 정확도 ' + Math.round(trkData.conf * 100) + '%';
  }
  function paintTrk() {
    var t = T_(), m = t.mode;
    trkHelp.textContent = TRK_HELP[m] || '';
    document.getElementById('trkUseRow').style.display = m === 'pin' ? 'none' : '';
    document.getElementById('trkBlurRow').style.display = m === 'pin' ? 'none' : '';
    document.getElementById('trkZoomRow').style.display = m === 'stab' ? '' : 'none';
    trkUse.querySelectorAll('button').forEach(function (b) {
      var on = !!t[b.dataset.v] || (m === 'stab' && b.dataset.v === 'pos');
      b.classList.toggle('on', on);
    });
    trkSmooth.value = t.smooth; trkSmoothVal.textContent = t.smooth ? String(t.smooth) : '끔';
    trkBlurBtn.classList.toggle('on', !!t.blur);
    trkBlurHint.textContent = m === 'follow'
      ? (t.blur ? '변형 효과에 기록 (셔터 180°)' : '끔 · 클립의 모션 속성에 기록')
      : (t.blur ? '셔터 180°' : '끔');
    trkInfo.textContent = trkInfoText(); trkInfo.className = trkData ? 'ok' : '';
    trkCard.classList.toggle('off', !trkData);
  }
  segs.push(paintTrk);
  var trkTabOnce = false;
  function openTrkTab() {
    paintTrk();
    if (!trkTabOnce) { trkTabOnce = true; call('mk_trackEnd'); }   /* 지난번에 꺼 둔 트랙이 남아 있으면 되돌림 */
  }

  /* ----- 화면 → 밝기 배열 ----- */
  var trkWork = document.createElement('canvas'), trkWG = null;
  function trkGray(im) {
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    if (!w || !h) return null;
    var k = Math.min(1, TRK_SIDE / Math.max(w, h)), aw = Math.max(8, Math.round(w * k)), ah = Math.max(8, Math.round(h * k));
    if (trkWork.width !== aw || trkWork.height !== ah || !trkWG) {
      trkWork.width = aw; trkWork.height = ah;
      trkWG = trkWork.getContext('2d', { willReadFrequently: true });
    }
    try {
      trkWG.drawImage(im, 0, 0, aw, ah);
      return TRK.grayFromRGBA(trkWG.getImageData(0, 0, aw, ah).data, aw, ah);
    } catch (e) { return null; }
  }
  /* 한 프레임 캡처 → { gray } (작업 캔버스에 그 화면이 남아 있음) 또는 { err } */
  async function trkGrab(frame, tpf, prevPath) {
    var r = await call('mk_trackGrab', { at: frame * tpf, del: prevPath || '' });
    if (!r.ok) return { err: r.err || 'noframe', msg: r.msg || '' };
    var im = null;
    for (var i = 0; i < 4 && !im; i++) { im = await loadFrame(r.path); if (!im) await wait(120); }   /* 파일이 아직 덜 써졌을 수 있음 */
    if (!im) return { err: 'load', path: r.path };
    var g = trkGray(im);
    return g ? { gray: g, path: r.path } : { err: 'pixels', path: r.path };
  }

  /* ----- 그리기 ----- */
  function trkPath(g, poly) {
    g.beginPath();
    for (var i = 0; i < poly.length; i++) { if (i) g.lineTo(poly[i][0], poly[i][1]); else g.moveTo(poly[i][0], poly[i][1]); }
    g.closePath();
  }
  function trkDraw(src, poly, pts, handles) {
    var w = trkCv.width, h = trkCv.height, u = Math.max(1, w / 520);
    trkG.drawImage(src, 0, 0, w, h);
    if (poly && poly.length >= 3) {
      trkG.save();
      trkG.fillStyle = 'rgba(0,0,0,.38)';
      trkG.beginPath(); trkG.rect(0, 0, w, h);
      for (var i = poly.length - 1; i >= 0; i--) { if (i === poly.length - 1) trkG.moveTo(poly[i][0], poly[i][1]); else trkG.lineTo(poly[i][0], poly[i][1]); }
      trkG.closePath(); trkG.fill('evenodd');
      trkPath(trkG, poly); trkG.lineWidth = 4 * u; trkG.strokeStyle = 'rgba(0,0,0,.6)'; trkG.stroke();
      trkPath(trkG, poly); trkG.lineWidth = 2 * u; trkG.strokeStyle = '#4f9cff'; trkG.stroke();
      trkG.restore();
    }
    if (pts) {
      trkG.fillStyle = '#7dffb0';
      for (var p = 0; p < pts.length; p++) trkG.fillRect(pts[p][0] - u, pts[p][1] - u, 2 * u, 2 * u);
    }
    if (handles && poly) {
      trkG.font = 'bold ' + Math.round(11 * u) + 'px sans-serif'; trkG.textAlign = 'center'; trkG.textBaseline = 'middle';
      for (var k = 0; k < poly.length; k++) {
        trkG.beginPath(); trkG.arc(poly[k][0], poly[k][1], 9 * u, 0, Math.PI * 2);
        trkG.fillStyle = '#2f6fd1'; trkG.fill(); trkG.lineWidth = 2 * u; trkG.strokeStyle = '#fff'; trkG.stroke();
        trkG.fillStyle = '#fff'; trkG.fillText(String(k + 1), poly[k][0], poly[k][1] + u * 0.5);
      }
    }
  }
  function trkRedraw() { if (trkSes && !trkSes.running) trkDraw(trkSes.shot, trkSes.poly, null, trkSes.mode === 'pin'); }
  function trkPolyOk(s) {
    if (!s.poly) return false;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    s.poly.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    return x1 - x0 >= 14 && y1 - y0 >= 14;
  }
  function trkPaintBox() {
    var s = trkSes; if (!s) return;
    trkBox.classList.toggle('run', !!s.running);
    trkGo.disabled = !s.running && !trkPolyOk(s);
    trkGo.style.opacity = trkGo.disabled ? '.45' : '';
    trkGo.textContent = s.running ? '중지' : '추적 시작';
    trkCancel.style.display = s.running ? 'none' : '';
  }

  /* ----- 영역 지정 (네모 드래그 / 모서리 4개) ----- */
  function trkPt(e) {
    var r = trkCv.getBoundingClientRect();
    return [Math.max(0, Math.min(trkCv.width, (e.clientX - r.left) * trkCv.width / Math.max(1, r.width))),
            Math.max(0, Math.min(trkCv.height, (e.clientY - r.top) * trkCv.height / Math.max(1, r.height)))];
  }
  var trkDrag = null;
  trkCv.addEventListener('mousedown', function (e) {
    var s = trkSes; if (!s || s.running) return;
    var p = trkPt(e);
    if (s.mode === 'pin') {
      var best = -1, bd = 1e9, lim = 26 * trkCv.width / Math.max(1, trkCv.getBoundingClientRect().width);
      for (var i = 0; i < s.poly.length; i++) { var d = Math.hypot(s.poly[i][0] - p[0], s.poly[i][1] - p[1]); if (d < bd) { bd = d; best = i; } }
      if (bd > lim * 3) return;
      trkDrag = { k: best, dx: s.poly[best][0] - p[0], dy: s.poly[best][1] - p[1] };
    } else {
      trkDrag = { a: p };
      s.poly = null;
    }
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    var s = trkSes; if (!trkDrag || !s) return;
    var p = trkPt(e);
    if (s.mode === 'pin') s.poly[trkDrag.k] = [Math.max(0, Math.min(trkCv.width, p[0] + trkDrag.dx)), Math.max(0, Math.min(trkCv.height, p[1] + trkDrag.dy))];
    else {
      var a = trkDrag.a, x0 = Math.min(a[0], p[0]), x1 = Math.max(a[0], p[0]), y0 = Math.min(a[1], p[1]), y1 = Math.max(a[1], p[1]);
      s.poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    }
    trkRedraw();
  });
  window.addEventListener('mouseup', function () {
    if (!trkDrag) return;
    trkDrag = null;
    var s = trkSes; if (!s) return;
    if (s.mode !== 'pin' && !trkPolyOk(s)) s.poly = null;
    trkRedraw(); trkPaintBox();
    if (s.mode !== 'pin') trkRead.textContent = s.poly ? '영역을 다시 끌면 새로 지정돼요' : '대상 위에서 끌어서 네모를 그리세요';
  });

  function trkClose() {
    trkBox.classList.remove('show', 'run');
    trkSes = null; trkDrag = null; trkProg.style.width = '0';
  }
  trkCancel.addEventListener('click', function () { if (trkSes && !trkSes.running) trkClose(); });
  trkBox.addEventListener('mousedown', function (e) { if (e.target === trkBox && trkSes && !trkSes.running) trkClose(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !trkBox.classList.contains('show') || !trkSes) return;
    if (trkSes.running) trkSes.stop = true; else trkClose();
  });

  /* ----- ① 화면 가져오기 ----- */
  document.getElementById('btnTrkGrab').addEventListener('click', async function () {
    if (trkBusy || trkSes) return;
    if (!TRK) return status('추적 엔진을 불러오지 못했어요 — 패널을 새로고침(↻)해 주세요', 'err');
    trkBusy = true;
    try {
      var t = T_(), c = await call('mk_trackTarget', {});
      if (!c.ok) return status(errText(c), 'err');
      if (!c.clips.length) return status(t.mode === 'stab' ? '고정할 영상 클립을 먼저 선택하세요' : '붙일 클립을 먼저 선택하세요', 'warn');
      var clip = c.clips[0], tpf = c.tpf, r0 = clip.start, r1 = clip.end, note = '';
      if (t.range === 'inout') {
        var a = Math.max(r0, c.inPt), b = Math.min(r1, c.outPt);
        if (c.outPt > c.inPt && b - a >= tpf * 2) { r0 = a; r1 = b; }
        else note = ' · 인·아웃 구간이 클립과 겹치지 않아 클립 전체를 추적해요';
      }
      var f0 = Math.round(r0 / tpf), f1 = Math.round(r1 / tpf) - 1;
      if (f1 - f0 < 1) return status('클립이 너무 짧아요', 'warn');
      var n = Math.floor((f1 - f0) / t.step) + 1;
      if (n > TRK_MAXFRAMES) return status('추적할 구간이 너무 길어요 (' + n + '프레임) → 범위를 "인·아웃 구간"으로 줄이거나 간격을 늘려 주세요', 'warn');
      var fr = Math.max(f0, Math.min(f1, Math.round(c.ph / tpf)));
      status('화면을 캡처하는 중…');
      var from = t.mode === 'stab' ? clip.t + 1 : clip.t;
      var bg = await call('mk_trackBegin', { from: from });
      if (!bg.ok) return status(trkErr(bg), 'err');
      var g = await trkGrab(fr, tpf, '');
      await call('mk_trackEnd', { del: g.path || '' });
      if (!g.gray) return status(trkErr(g) + ' → "진단 정보 복사"를 눌러 알려주세요', 'err');
      var shot = document.createElement('canvas'); shot.width = g.gray.w; shot.height = g.gray.h;
      shot.getContext('2d').drawImage(trkWork, 0, 0);
      trkCv.width = g.gray.w; trkCv.height = g.gray.h;
      var W = g.gray.w, H = g.gray.h;
      trkSes = { ctx: c, clip: clip, f0: f0, f1: f1, fr: fr, tpf: tpf, mode: t.mode, step: t.step, from: from, gray: g.gray, shot: shot, aw: W, ah: H,
        poly: t.mode === 'pin' ? [[W * 0.3, H * 0.3], [W * 0.7, H * 0.3], [W * 0.7, H * 0.7], [W * 0.3, H * 0.7]] : null, running: false, stop: false };
      trkTitle.textContent = TRK_TITLE[t.mode];
      trkSub.textContent = t.mode === 'pin'
        ? '점 1~4 를 끌어서 화면의 왼쪽 위 → 오른쪽 위 → 오른쪽 아래 → 왼쪽 아래 모서리에 맞추세요'
        : '따라갈 대상 위에서 끌어서 네모를 그리세요 · 무늬가 뚜렷한 곳일수록 잘 따라가요';
      trkRead.textContent = n + '프레임 추적 예정';
      trkProg.style.width = '0';
      trkBox.classList.add('show'); trkRedraw(); trkPaintBox();
      status('대상을 지정하고 "추적 시작"을 누르세요' + note, 'ok');
    } finally { trkBusy = false; }
  });

  /* ----- 추적 실행 ----- */
  trkGo.addEventListener('click', async function () {
    var s = trkSes; if (!s) return;
    if (s.running) { s.stop = true; return; }
    if (!trkPolyOk(s)) return;
    var model = s.mode === 'pin' ? 'homography' : 'similarity';
    var probe = new TRK.Tracker(s.gray, s.poly, { model: model });
    if (probe.initial < probe.minNeeded() * 2) {
      trkRead.textContent = '이 영역은 무늬가 부족해서 따라가기 어려워요 → 모서리·글자·얼굴처럼 뚜렷한 곳을 포함해 다시 지정하세요';
      return;
    }
    s.running = true; s.stop = false; trkPaintBox();
    trkSub.textContent = '추적하는 중… 끝나면 선택한 클립에 바로 들어가요';
    var fwd = [], back = [], f, prevPath = '', lost = 0, failMsg = '';
    for (f = s.fr + s.step; f <= s.f1; f += s.step) fwd.push(f);
    for (f = s.fr - s.step; f >= s.f0; f -= s.step) back.push(f);
    var total = fwd.length + back.length, doneN = 0, got = {}, t0 = Date.now();
    got[s.fr] = probe.result(true, 1);
    var bg = await call('mk_trackBegin', { from: s.from });
    if (!bg.ok) { s.running = false; trkPaintBox(); trkRead.textContent = trkErr(bg); return; }
    try {
      var dirs = [fwd, back];
      for (var d = 0; d < 2 && !s.stop && !failMsg; d++) {
        var tk = d === 0 ? probe : new TRK.Tracker(s.gray, s.poly, { model: model });
        for (var i = 0; i < dirs[d].length; i++) {
          if (s.stop) break;
          var g = await trkGrab(dirs[d][i], s.tpf, prevPath);
          prevPath = g.path || '';
          if (!g.gray) { failMsg = trkErr(g); break; }
          if (g.gray.w !== s.aw || g.gray.h !== s.ah) { failMsg = TRK_ERR.pixels; break; }
          var r = tk.step(g.gray);
          doneN++;
          if (!r.ok) { lost++; doneN += dirs[d].length - i - 1; break; }
          got[dirs[d][i]] = r;
          trkDraw(trkWork, r.corners, tk.cur, false);
          trkProg.style.width = (100 * doneN / Math.max(1, total)).toFixed(1) + '%';
          var left = (Date.now() - t0) / doneN * (total - doneN) / 1000;
          trkRead.textContent = doneN + ' / ' + total + '프레임 · 약 ' + Math.max(1, Math.round(left)) + '초 남음';
        }
      }
    } finally {
      await call('mk_trackEnd', { del: prevPath });
    }
    var frames = Object.keys(got).map(Number).sort(function (a, b) { return a - b; });
    if (frames.length < 2) {
      s.running = false; trkPaintBox(); trkRedraw();
      trkRead.textContent = failMsg || (s.stop ? '중지했어요' : '대상을 따라가지 못했어요 → 영역을 조금 넓혀서 다시 지정해 보세요');
      return;
    }
    var conf = 0, res = frames.map(function (k) { conf += got[k].conf; return got[k]; });
    trkData = { mode: s.mode, model: model, frames: frames, res: res, refIdx: frames.indexOf(s.fr), tpf: s.tpf, aw: s.aw, ah: s.ah, conf: conf / frames.length };
    var stopped = s.stop;
    trkClose(); paintTrk();
    var tail = lost ? ' · 중간에 대상을 놓쳐서 ' + frames.length + '프레임까지만 들어갔어요' : (stopped ? ' · 중지한 곳까지만 들어갔어요' : '') + (failMsg ? ' · ' + failMsg : '');
    await trkApply(tail, lost || failMsg ? 'warn' : 'ok');
  });

  /* ----- 키프레임 계산 → 적용 ----- */
  function trkScaled(tr, kx, ky) {
    var k = Math.sqrt(kx * ky);
    return { n: tr.n, x: tr.x.map(function (v) { return v * kx; }), y: tr.y.map(function (v) { return v * ky; }), scale: tr.scale, rotation: tr.rotation, ok: tr.ok, k: k,
      corners: tr.corners.map(function (c) { return { x: c.x.map(function (v) { return v * kx; }), y: c.y.map(function (v) { return v * ky; }) }; }) };
  }
  /* 클립의 모션(위치·비율·회전·기준점): 원본 좌표 ↔ 화면 좌표 */
  function trkMotion(clip, W, H) {
    var m = clip.motion || { pos: [0.5, 0.5], scale: 100, scaleW: 100, uni: true, rot: 0, anchor: [0.5, 0.5] };
    var lw = (clip.layer && clip.layer.w) || W, lh = (clip.layer && clip.layer.h) || H;
    var s = Math.max(0.0001, m.scale / 100), th = m.rot * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
    var P = [m.pos[0] * W, m.pos[1] * H], a = [m.anchor[0] * lw, m.anchor[1] * lh];
    return {
      m: m, lw: lw, lh: lh, P: P,
      fwd: function (x, y) { var dx = (x - a[0]) * s, dy = (y - a[1]) * s; return [P[0] + c * dx - sn * dy, P[1] + sn * dx + c * dy]; },
      inv: function (x, y) { var dx = (x - P[0]) / s, dy = (y - P[1]) / s; return [a[0] + c * dx + sn * dy, a[1] - sn * dx + c * dy]; }
    };
  }
  function r4(v) { return Math.round(v * 100000) / 100000; }
  function trkPlan(clip, d, tr, t, mode, W, H) {
    var M = trkMotion(clip, W, H), idx = [], kf = [], i;
    for (i = 0; i < d.frames.length; i++) {
      var tk = d.frames[i] * d.tpf;
      if (tk < clip.start - d.tpf * 0.5 || tk > clip.end - d.tpf * 0.5) continue;
      idx.push(i); kf.push(r4((tk - clip.start) / d.tpf));
    }
    if (idx.length < 2) return null;
    function keys(fn) { return idx.map(function (ix, n) { return [kf[n], fn(ix)]; }); }
    var use = { pos: mode === 'stab' ? true : !!t.pos, scale: !!t.scale, rot: !!t.rot }, plan = { t: clip.t, c: clip.c, params: [] }, ks;
    if (mode === 'pin') {
      plan.target = 'cpin';
      var order = [['UL', 0, 0], ['UR', 1, 1], ['LL', 2, 3], ['LR', 3, 2]];   /* 지정 순서: 왼위·오른위·오른아래·왼아래 */
      order.forEach(function (o) {
        var cn = tr.corners[o[2]];
        plan.params.push({ n: o[0], i: o[1], keys: keys(function (ix) { var p = M.inv(cn.x[ix], cn.y[ix]); return [r4(p[0] / M.lw), r4(p[1] / M.lh)]; }) });
      });
      return plan;
    }
    if (mode === 'stab') {
      ks = TRK.stabilizeKeys(tr, d.refIdx, use);
      var z = (t.zoom || 100) / 100, p0 = M.inv(tr.x[d.refIdx], tr.y[d.refIdx]);
      plan.target = 'tf'; plan.shutter = t.blur ? 180 : 0;
      plan.params.push({ i: 0, keys: keys(function (ix) { var p = M.inv(ks[ix].anchorX, ks[ix].anchorY); return [r4(p[0] / M.lw), r4(p[1] / M.lh)]; }) });
      plan.params.push({ i: 1, value: [r4(p0[0] / M.lw), r4(p0[1] / M.lh)] });
      plan.params.push(use.scale ? { i: 3, keys: keys(function (ix) { return r4(100 * z * ks[ix].scale); }) } : { i: 3, value: r4(100 * z) });
      plan.params.push(use.rot ? { i: 7, keys: keys(function (ix) { return r4(ks[ix].rotation); }) } : { i: 7, value: 0 });
      return plan;
    }
    /* 따라가기 */
    if (!use.pos && !use.scale && !use.rot) return null;
    if (!t.blur) {
      ks = TRK.followKeys(tr, d.refIdx, { x: M.P[0], y: M.P[1] }, use);
      plan.target = 'motion';
      if (use.pos) plan.params.push({ i: 0, keys: keys(function (ix) { return [r4(ks[ix].x / W), r4(ks[ix].y / H)]; }) });
      if (use.scale) {
        plan.params.push({ i: 1, keys: keys(function (ix) { return r4(M.m.scale * ks[ix].scale); }) });
        if (!M.m.uni) plan.params.push({ i: 2, keys: keys(function (ix) { return r4(M.m.scaleW * ks[ix].scale); }) });
      }
      if (use.rot) plan.params.push({ i: 4, keys: keys(function (ix) { return r4(M.m.rot + ks[ix].rotation); }) });
      return plan;
    }
    var A = M.fwd(M.lw / 2, M.lh / 2);
    ks = TRK.followKeys(tr, d.refIdx, { x: A[0], y: A[1] }, use);
    plan.target = 'tf'; plan.shutter = 180;
    plan.params.push({ i: 0, value: [0.5, 0.5] });
    plan.params.push(use.pos ? { i: 1, keys: keys(function (ix) { var p = M.inv(ks[ix].x, ks[ix].y); return [r4(p[0] / M.lw), r4(p[1] / M.lh)]; }) } : { i: 1, value: [0.5, 0.5] });
    plan.params.push(use.scale ? { i: 3, keys: keys(function (ix) { return r4(100 * ks[ix].scale); }) } : { i: 3, value: 100 });
    plan.params.push(use.rot ? { i: 7, keys: keys(function (ix) { return r4(ks[ix].rotation); }) } : { i: 7, value: 0 });
    return plan;
  }
  async function trkApply(tail, cls) {
    var d = trkData, t = T_();
    if (!d) return status('먼저 "① 화면 가져와서 추적하기"로 추적해 주세요', 'warn');
    var mode = t.mode;
    if ((mode === 'pin') !== (d.mode === 'pin')) {
      return status('지금 추적 결과는 "' + TRK_MODE[d.mode] + '"용이에요 → "' + TRK_MODE[mode] + '" 방식으로 다시 추적해 주세요', 'warn');
    }
    var c = await call('mk_trackTarget', { at: d.frames[d.refIdx] * d.tpf });
    if (!c.ok) return status(errText(c), 'err');
    if (!c.clips.length) return status('적용할 클립을 먼저 선택하세요', 'warn');
    var tr = trkScaled(TRK.buildTracks(d.res, t.smooth), c.w / d.aw, c.h / d.ah), plans = [], skipped = 0;
    c.clips.forEach(function (clip) { var p = trkPlan(clip, d, tr, t, mode, c.w, c.h); if (p) plans.push(p); else skipped++; });
    if (!plans.length) {
      return status(mode === 'follow' && !t.pos && !t.scale && !t.rot ? '속성(위치·비율·회전)을 하나 이상 켜 주세요' : '선택한 클립이 추적한 구간과 겹치지 않아요', 'warn');
    }
    status('키프레임을 넣는 중…');
    var r = await call('mk_trackApply', plans);
    if (!r.ok) return status(trkErr(r), 'err');
    if (!r.done) return status(trkErr({ err: r.failed[0] || 'noparam' }), 'err');
    var where = plans[0].target === 'motion' ? '모션' : plans[0].target === 'tf' ? '변형 효과' : '모퉁이 고정';
    status('✓ ' + TRK_MODE[mode] + ' 적용 · 클립 ' + r.done + '개 · ' + where + '에 키프레임 ' + plans[0].params.reduce(function (a, p) { return Math.max(a, p.keys ? p.keys.length : 0); }, 0) + '개'
      + (r.failed.length ? ' · 실패 ' + r.failed.length + '개 (' + trkErr({ err: r.failed[0] }) + ')' : '') + (skipped ? ' · 구간 밖 ' + skipped + '개 제외' : '') + (tail || ''),
      r.failed.length ? 'warn' : (cls || 'ok'));
  }
  document.getElementById('btnTrkApply').addEventListener('click', async function () {
    if (trkBusy) return;
    trkBusy = true;
    try { await trkApply('', 'ok'); } finally { trkBusy = false; }
  });
  document.getElementById('btnTrkClear').addEventListener('click', async function () {
    var r = await call('mk_trackClear');
    if (!r.ok) return status(errText(r), 'err');
    if (!r.clips) return status('클립을 먼저 선택하세요', 'warn');
    status('✓ 추적 키프레임 지움 · 모션 속성 ' + r.fixed + '개 · 모퉁이 고정 ' + r.removed + '개'
      + (r.tf ? ' · 변형 효과에 넣은 추적은 위의 "효과 지우기"로 지워요' : ''), 'ok');
  });

  /* ---------- 시작 ---------- */
  function refreshAll() {
    segs.forEach(function (p) { p(); });
    paintBlur(); paintTyping(); paintKinds(); paintKindsRow(); paintDur(); paintPivot(); paintAutoArea(); paintColors(); paintTip();
    renderCats(); renderGrid(); renderCurveChips(); drawCurve(); renderFxFavs(); renderFxList();
    wasMini = null; layout();
  }
  /* ---------- 언어 버튼 ---------- */
  var btnLang = document.getElementById('btnLang');
  function applyLang() {
    LANG = S.lang === 'en' ? 'en' : 'ko';
    document.documentElement.lang = LANG;
    MK.setPreviewText(isEn() ? 'Moment Kit' : '모먼트 모션킷');
    if (btnLang) { btnLang.textContent = isEn() ? '한' : 'EN'; btnLang.title = isEn() ? '한국어로 보기' : 'View in English'; }
    if (!isEn()) untrTree(document.body);
    refreshAll();
    try { setFold(motionOpts.classList.contains('folded')); paintSum(); } catch (e) {}
    if (isEn()) trTree(document.body);
  }
  if (btnLang) btnLang.addEventListener('click', function () { S.lang = isEn() ? 'ko' : 'en'; save(); applyLang(); });
  watchLang();
  LANG = S.lang === 'en' ? 'en' : 'ko';
  refreshAll();
  setFold(lsGet(FOLD_KEY) === '1'); paintSum();
  if (isEn()) applyLang(); else if (btnLang) { btnLang.textContent = 'EN'; btnLang.title = 'View in English'; }
  /* v1.6.5: 시작점 기본값을 "클립 시작"으로 — 예전 설정도 한 번 맞춘다 */
  sync(true, function (remote) {
    var mig = Math.max(S.mig || 0, (remote && remote.mig) || 0), ch = false;
    if (mig < 164) { opts.anchor = 'start'; ch = true; }
    /* v1.6.5: 타이핑 기본 속도를 글자당 4프레임으로 (예전 1~2프레임은 마스크처럼 너무 빨랐음) */
    if (mig < 165) { if (!(opts.typing.fpc >= 3)) opts.typing.fpc = 4; ch = true; }
    if (ch) { S.mig = 165; save(); refreshAll(); }
  });
  /* ---------- 연결 확인 (재시도 → 프리미어 쪽 스크립트 다시 불러오기) ---------- */
  var connErr = '';
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rawEval(script) {
    return new Promise(function (resolve) { try { cep.evalScript(script, function (r) { resolve(String(r)); }); } catch (e) { resolve('throw ' + e); } });
  }
  function extPath() {
    try {
      var raw = String(cep.getSystemPath('extension') || '');
      raw = /^file:\/\/\/[A-Za-z]:/.test(raw) ? raw.replace(/^file:\/\/\//, '') : raw.replace(/^file:\/\//, '');
      return decodeURI(raw);
    } catch (e) { return ''; }
  }
  async function connect() {
    var r = null, i;
    for (i = 0; i < 4; i++) {
      r = await call('mk_ping');
      if (r.ok) return r;
      status('프리미어와 연결하는 중… (' + (i + 1) + ')');
      await wait(600 + i * 500);
    }
    if (!cep) return r;
    /* 스크립트가 안 불러와졌거나 문법 오류 → 직접 다시 불러온다 */
    var how = [], res;
    if (window.MK_HOST) { res = await rawEval(window.MK_HOST); how.push('update:' + res); r = await call('mk_ping'); if (r.ok) return r; }
    var ep = extPath();
    if (ep) {
      var lit = JSON.stringify(ep + '/jsx/host.jsx').replace(/[\u0080-\uffff]/g, function (c) { return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4); });
      res = await rawEval('try { $.evalFile(' + lit + '); "loaded" } catch (e) { "err " + e.line + ": " + e }');
      how.push('file:' + res); r = await call('mk_ping'); if (r.ok) return r;
    }
    connErr = 'ping: ' + (r.err || '') + ' ' + (r.msg || '') + ' | reload ' + how.join(' / ') + ' | ext ' + ep;
    return r;
  }
  connect().then(function (r) {
    if (r && r.ok) {
      status((RUN.src === 'online' ? '✓ 새 버전으로 자동 업데이트됐어요 · ' : '준비 완료 · ') + 'Moment_Motion Kit ' + VERSION + ' (' + (SRCNAME[RUN.src] || RUN.src) + ')' + (r.version ? ' · Premiere ' + r.version : ''), 'ok');
      call('mk_cleanTmp');                     /* 지난번에 남은 캡처 파일 정리 */
    } else if (cep) status('프리미어와 연결되지 않았어요 — 프리미어를 재시작해 보세요 · 계속되면 "진단 정보 복사"를 눌러 알려주세요 (' + VERSION + ')', 'err');
  });
  if (!cep && !window.MK_MOCK) status('미리보기 모드 — 프리미어 안에서 열면 적용돼요', 'warn');
})();
