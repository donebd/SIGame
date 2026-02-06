import { Question } from '../types';

export class FinalRoundView {
    private container: HTMLElement;
    private onBanTheme: (theme: string) => void;
    private onPlayQuestion: (question: Question) => void;

    constructor(
        container: HTMLElement,
        onBanTheme: (theme: string) => void,
        onPlayQuestion: (question: Question) => void
    ) {
        this.container = container;
        this.onBanTheme = onBanTheme;
        this.onPlayQuestion = onPlayQuestion;
    }

    render(questions: Question[], bannedThemes: string[]): void {
        this.container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'final-round-container';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.height = '100%';
        wrapper.style.gap = '20px';

        const title = document.createElement('h2');
        title.textContent = 'ФИНАЛ: Убирайте темы';
        title.style.color = '#fff';
        wrapper.appendChild(title);

        const themesGrid = document.createElement('div');
        themesGrid.style.display = 'grid';
        themesGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        themesGrid.style.gap = '15px';
        themesGrid.style.width = '100%';
        themesGrid.style.maxWidth = '800px';

        const activeThemes = questions.filter(q => !bannedThemes.includes(q.category));

        // If only one theme remains, show "Play" button for it
        if (activeThemes.length === 1 && questions.length > 1) {
            const lastTheme = activeThemes[0];
            this.renderPlayButton(wrapper, lastTheme);
        } else {
            // Render theme buttons
            questions.forEach(q => {
                const isBanned = bannedThemes.includes(q.category);
                const btn = document.createElement('button');
                btn.className = `btn ${isBanned ? 'btn-banned' : 'btn-theme'}`;
                btn.textContent = q.category;
                btn.style.padding = '20px';
                btn.style.fontSize = '1.2em';
                btn.style.cursor = isBanned ? 'default' : 'pointer';
                btn.style.opacity = isBanned ? '0.3' : '1';
                btn.style.textDecoration = isBanned ? 'line-through' : 'none';
                btn.style.border = '2px solid #03dac6';
                btn.style.backgroundColor = isBanned ? '#333' : 'transparent';
                btn.style.color = '#fff';
                btn.style.borderRadius = '8px';
                btn.style.transition = 'all 0.3s';

                if (!isBanned) {
                    btn.onclick = () => this.onBanTheme(q.category);
                    btn.onmouseenter = () => btn.style.backgroundColor = 'rgba(3, 218, 198, 0.2)';
                    btn.onmouseleave = () => btn.style.backgroundColor = 'transparent';
                }

                themesGrid.appendChild(btn);
            });
            wrapper.appendChild(themesGrid);
        }

        this.container.appendChild(wrapper);
    }

    private renderPlayButton(container: HTMLElement, question: Question): void {
        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn-main';
        playBtn.textContent = `Играть: ${question.category}`;
        playBtn.style.padding = '30px 60px';
        playBtn.style.fontSize = '2em';
        playBtn.onclick = () => this.onPlayQuestion(question);
        container.appendChild(playBtn);
    }
}
