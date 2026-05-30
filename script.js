// State Objects
const state = {
    timer: {
        mode: 'study', // 'study' or 'break'
        studyTime: 25 * 60,
        breakTime: 5 * 60,
        timeLeft: 25 * 60,
        isRunning: false,
        intervalId: null,
        sessionCount: 1,
        totalFocusTime: parseInt(localStorage.getItem('focusTime')) || 0, // in seconds
    },
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    sounds: {
        currentSound: null,
        volume: 0.5
    },
    stats: {
        completedPomodoros: parseInt(localStorage.getItem('completedPomodoros')) || 0,
        streak: parseInt(localStorage.getItem('streak')) || 0,
        lastActiveDate: localStorage.getItem('lastActiveDate') || new Date().toDateString(),
        weeklyData: JSON.parse(localStorage.getItem('weeklyData')) || [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
    },
    theme: localStorage.getItem('theme') || 'dark',
    quotes: [
        "Discipline beats motivation.",
        "Small progress every day adds up to big results.",
        "Focus on being productive instead of busy.",
        "Your future is created by what you do today, not tomorrow.",
        "Don't stop when you're tired. Stop when you're done.",
        "The secret of your future is hidden in your daily routine."
    ],
    currentQuoteIndex: 0
};

// DOM Elements
const DOM = {
    // Theme & Focus
    themeBtn: document.getElementById('theme-btn'),
    focusBtn: document.getElementById('focus-mode-btn'),
    
    // Timer
    timeDisplay: document.getElementById('time-display'),
    startPauseBtn: document.getElementById('start-pause-btn'),
    resetBtn: document.getElementById('reset-btn'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    sessionCount: document.getElementById('session-count'),
    progressCircle: document.querySelector('.progress-ring__circle'),
    
    // Tasks
    taskInput: document.getElementById('task-input'),
    taskPriority: document.getElementById('task-priority'),
    addTaskBtn: document.getElementById('add-task-btn'),
    taskList: document.getElementById('task-list'),
    taskCounter: document.getElementById('task-counter'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    
    // Sounds
    soundBtns: document.querySelectorAll('.sound-item'),
    volumeSlider: document.getElementById('volume-slider'),
    audioElements: {
        rain: document.getElementById('audio-rain'),
        cafe: document.getElementById('audio-cafe'),
        forest: document.getElementById('audio-forest')
    },
    
    // Stats
    statTime: document.getElementById('stat-time'),
    statSessions: document.getElementById('stat-sessions'),
    statStreak: document.getElementById('stat-streak'),
    chartBars: document.getElementById('chart-bars'),
    
    // Quotes
    quoteText: document.getElementById('quote-text'),
    nextQuoteBtn: document.getElementById('next-quote-btn')
};

// Constants for SVG progress ring
const radius = DOM.progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
DOM.progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
DOM.progressCircle.style.strokeDashoffset = circumference;

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    DOM.progressCircle.style.strokeDashoffset = offset;
}


/* ===========================
    MODULES
=========================== */

// 1. Theme Module
const ThemeModule = {
    init() {
        if (state.theme === 'light') {
            document.body.classList.remove('dark-mode');
            DOM.themeBtn.innerHTML = "<i class='bx bx-moon'></i>";
        } else {
            document.body.classList.add('dark-mode');
            DOM.themeBtn.innerHTML = "<i class='bx bx-sun'></i>";
        }
        
        DOM.themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                state.theme = 'dark';
                DOM.themeBtn.innerHTML = "<i class='bx bx-sun'></i>";
            } else {
                state.theme = 'light';
                DOM.themeBtn.innerHTML = "<i class='bx bx-moon'></i>";
            }
            localStorage.setItem('theme', state.theme);
        });

        DOM.focusBtn.addEventListener('click', () => {
            document.body.classList.toggle('focus-mode');
        });
    }
};

// 2. Timer Module
const TimerModule = {
    init() {
        this.updateDisplay();
        
        DOM.startPauseBtn.addEventListener('click', () => this.toggleTimer());
        DOM.resetBtn.addEventListener('click', () => this.resetTimer());
        
        DOM.modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.getAttribute('data-mode');
                this.switchMode(mode);
            });
        });

        // Keyboard shortcut Space to start/pause
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.toggleTimer();
            }
        });
    },

    toggleTimer() {
        if (state.timer.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    },

    startTimer() {
        if (!state.timer.isRunning) {
            state.timer.isRunning = true;
            DOM.startPauseBtn.innerHTML = "<i class='bx bx-pause'></i> Pause";
            
            state.timer.intervalId = setInterval(() => {
                state.timer.timeLeft--;
                this.updateDisplay();
                
                // Track focus time if in study mode
                if (state.timer.mode === 'study') {
                    state.timer.totalFocusTime++;
                    if (state.timer.totalFocusTime % 60 === 0) {
                        StatsModule.saveStats();
                        StatsModule.updateDisplay();
                    }
                }

                if (state.timer.timeLeft <= 0) {
                    this.completeSession();
                }
            }, 1000);
        }
    },

    pauseTimer() {
        state.timer.isRunning = false;
        clearInterval(state.timer.intervalId);
        DOM.startPauseBtn.innerHTML = "<i class='bx bx-play'></i> Start";
    },

    resetTimer() {
        this.pauseTimer();
        state.timer.timeLeft = state.timer.mode === 'study' ? state.timer.studyTime : state.timer.breakTime;
        this.updateDisplay();
    },

    switchMode(mode) {
        state.timer.mode = mode;
        this.pauseTimer();
        DOM.modeBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
        
        state.timer.timeLeft = mode === 'study' ? state.timer.studyTime : state.timer.breakTime;
        this.updateDisplay();
    },

    completeSession() {
        this.pauseTimer();
        
        // Play notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
        
        if (state.timer.mode === 'study') {
            state.stats.completedPomodoros++;
            
            // Update weekly chart data
            const today = new Date().getDay();
            state.stats.weeklyData[today]++;
            
            StatsModule.saveStats();
            StatsModule.updateDisplay();
            StatsModule.renderChart();
            
            // Switch to break
            state.timer.sessionCount++;
            DOM.sessionCount.innerText = `Session ${state.timer.sessionCount}`;
            this.switchMode('break');
            
        } else {
            // Switch to study
            this.switchMode('study');
        }
        
        // Auto start next session
        setTimeout(() => this.startTimer(), 1500);
    },

    updateDisplay() {
        const minutes = Math.floor(state.timer.timeLeft / 60);
        const seconds = state.timer.timeLeft % 60;
        
        const displayString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        DOM.timeDisplay.innerText = displayString;
        document.title = `${displayString} - FocusFlow`;
        
        // Update Ring
        const totalDuration = state.timer.mode === 'study' ? state.timer.studyTime : state.timer.breakTime;
        const progressPercent = ((totalDuration - state.timer.timeLeft) / totalDuration) * 100;
        setProgress(progressPercent);
    }
};

// 3. Task Module
const TaskModule = {
    currentFilter: 'all',

    init() {
        this.renderTasks();
        
        DOM.addTaskBtn.addEventListener('click', () => this.addTask());
        DOM.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        DOM.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                DOM.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                this.renderTasks();
            });
        });
    },

    addTask() {
        const text = DOM.taskInput.value.trim();
        const priority = DOM.taskPriority.value;
        
        if (text) {
            const task = {
                id: Date.now().toString(),
                text: text,
                priority: priority,
                completed: false
            };
            
            state.tasks.push(task);
            this.saveTasks();
            this.renderTasks();
            
            DOM.taskInput.value = '';
        }
    },

    toggleTask(id) {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
        }
    },

    deleteTask(id) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
    },

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(state.tasks));
    },

    renderTasks() {
        DOM.taskList.innerHTML = '';
        
        let filteredTasks = state.tasks;
        if (this.currentFilter === 'active') {
            filteredTasks = state.tasks.filter(t => !t.completed);
        } else if (this.currentFilter === 'completed') {
            filteredTasks = state.tasks.filter(t => t.completed);
        }
        
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <div class="task-content">
                    <div class="task-checkbox"></div>
                    <span class="task-text">${task.text}</span>
                    <span class="priority-dot priority-${task.priority}"></span>
                </div>
                <button class="delete-btn"><i class='bx bx-trash'></i></button>
            `;
            
            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('click', () => this.toggleTask(task.id));
            
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
            
            DOM.taskList.appendChild(li);
        });
        
        this.updateCounter();
    },
    
    updateCounter() {
        const completedCount = state.tasks.filter(t => t.completed).length;
        DOM.taskCounter.innerText = `${completedCount}/${state.tasks.length} Completed`;
    }
};

// 4. Sound Module
const SoundModule = {
    init() {
        DOM.volumeSlider.addEventListener('input', (e) => {
            state.sounds.volume = parseFloat(e.target.value);
            if (state.sounds.currentSound) {
                DOM.audioElements[state.sounds.currentSound].volume = state.sounds.volume;
            }
        });

        DOM.soundBtns.forEach(item => {
            item.addEventListener('click', () => {
                const soundName = item.getAttribute('data-sound');
                this.toggleSound(soundName, item);
            });
        });
    },

    toggleSound(soundName, element) {
        // Stop current sound if playing
        if (state.sounds.currentSound && state.sounds.currentSound !== soundName) {
            const prevAudio = DOM.audioElements[state.sounds.currentSound];
            this.fadeOut(prevAudio);
            
            // Remove active class from previous button
            document.querySelector(`.sound-item[data-sound="${state.sounds.currentSound}"]`).classList.remove('active');
        }

        const audio = DOM.audioElements[soundName];
        
        if (element.classList.contains('active')) {
            // Pause
            this.fadeOut(audio);
            element.classList.remove('active');
            state.sounds.currentSound = null;
        } else {
            // Play
            audio.volume = 0;
            audio.play();
            this.fadeIn(audio, state.sounds.volume);
            element.classList.add('active');
            state.sounds.currentSound = soundName;
        }
    },
    
    fadeIn(audio, targetVolume) {
        let vol = 0;
        const interval = setInterval(() => {
            if (vol < targetVolume) {
                vol += 0.05;
                if (vol > targetVolume) vol = targetVolume;
                audio.volume = vol;
            } else {
                clearInterval(interval);
            }
        }, 50);
    },
    
    fadeOut(audio) {
        let vol = audio.volume;
        const interval = setInterval(() => {
            if (vol > 0) {
                vol -= 0.05;
                if (vol < 0) vol = 0;
                audio.volume = vol;
            } else {
                audio.pause();
                clearInterval(interval);
            }
        }, 50);
    }
};

// 5. Stats Module
const StatsModule = {
    init() {
        this.checkDailyReset();
        this.updateDisplay();
        this.renderChart();
    },

    checkDailyReset() {
        const today = new Date().toDateString();
        if (state.stats.lastActiveDate !== today) {
            // Check if streak is broken (more than 1 day diff)
            const lastDate = new Date(state.stats.lastActiveDate);
            const currentDate = new Date(today);
            const diffTime = Math.abs(currentDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
                state.stats.streak++;
            } else if (diffDays > 1) {
                state.stats.streak = 1;
            }
            
            // Reset weekly data if it's Sunday
            if (currentDate.getDay() === 0 && diffDays >= 1) {
                state.stats.weeklyData = [0, 0, 0, 0, 0, 0, 0];
            }
            
            state.stats.lastActiveDate = today;
            this.saveStats();
        }
    },

    saveStats() {
        localStorage.setItem('focusTime', state.timer.totalFocusTime);
        localStorage.setItem('completedPomodoros', state.stats.completedPomodoros);
        localStorage.setItem('streak', state.stats.streak);
        localStorage.setItem('lastActiveDate', state.stats.lastActiveDate);
        localStorage.setItem('weeklyData', JSON.stringify(state.stats.weeklyData));
    },

    updateDisplay() {
        const hours = Math.floor(state.timer.totalFocusTime / 3600);
        const minutes = Math.floor((state.timer.totalFocusTime % 3600) / 60);
        
        DOM.statTime.innerText = `${hours}h ${minutes}m`;
        DOM.statSessions.innerText = state.stats.completedPomodoros;
        DOM.statStreak.innerText = `${state.stats.streak} Days`;
    },
    
    renderChart() {
        DOM.chartBars.innerHTML = '';
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const maxSessions = Math.max(...state.stats.weeklyData, 1); // Avoid div by 0
        
        state.stats.weeklyData.forEach((sessions, index) => {
            const heightPercent = (sessions / maxSessions) * 100;
            
            const barContainer = document.createElement('div');
            barContainer.className = 'chart-bar-container';
            
            barContainer.innerHTML = `
                <div class="bar" style="height: ${Math.max(heightPercent, 5)}%"></div>
                <span class="day-label">${days[index]}</span>
            `;
            
            DOM.chartBars.appendChild(barContainer);
        });
    }
};

// 6. Quote Module
const QuoteModule = {
    init() {
        this.displayQuote();
        
        DOM.nextQuoteBtn.addEventListener('click', () => {
            this.nextQuote();
        });
        
        // Auto rotate every 30 seconds
        setInterval(() => this.nextQuote(), 30000);
    },
    
    displayQuote() {
        DOM.quoteText.style.opacity = 0;
        setTimeout(() => {
            DOM.quoteText.innerText = state.quotes[state.currentQuoteIndex];
            DOM.quoteText.style.opacity = 1;
        }, 500);
    },
    
    nextQuote() {
        state.currentQuoteIndex = (state.currentQuoteIndex + 1) % state.quotes.length;
        this.displayQuote();
    }
};


// App Initialization
function initApp() {
    ThemeModule.init();
    TimerModule.init();
    TaskModule.init();
    SoundModule.init();
    StatsModule.init();
    QuoteModule.init();
}

document.addEventListener('DOMContentLoaded', initApp);
