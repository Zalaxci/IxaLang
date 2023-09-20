customElements.define('language-picker', class LanguagePicker extends LitElement {
	#selectedTargetLang = ''
	static properties = {
		selectLanguagePair: {
			type: Function
		},
		_selectedBaseLang: {
			type: String,
			state: true
		}
	}
	constructor() {
		super()
		this._selectedBaseLang = 'ell'
	}
	#selectTargetLang(targetLang) {
		this.#selectedTargetLang = targetLang
		const selectedLanguagePair = `${this._selectedBaseLang}-${targetLang}`
		this.selectLanguagePair(selectedLanguagePair)
	}
	render() {
		const targetLangsForSelectedBaseLang = availableTargetLangs[this._selectedBaseLang]
		if (!targetLangsForSelectedBaseLang.includes(this.#selectedTargetLang)) {
			this.#selectTargetLang(targetLangsForSelectedBaseLang[0])
		}
		return html`
			<div class="colored-box">
				Look up a word from
				<select name="base-lang" id="base-lang" @input=${(e) => this._selectedBaseLang = e.target.value}>
					${Object.keys(availableTargetLangs).map(baseLang => html`
						<option value=${baseLang}>${baseLang}</option>
					`)}
				</select>
				to
				<select name="target-lang" id="target-lang" @input=${(e) => this.#selectTargetLang(e.target.value)}>
					${targetLangsForSelectedBaseLang.map(targetLang => html`
						<option value=${targetLang}>${targetLang}</option>
					`)}
				</select>
			</div>
		`
	}
})
customElements.define('ixalang-dictionary', class IxaLangDictionary extends LitElement {
	#selectedLanguagePair = ''
	#userInput = ''
	#xmlPromises = [
		'<dictionary></dictionary>'
	]
	get minimumInputBytes() {
		return 3
	}
	get maximumInputCharacters() {
		return 4
	}
	get #newestXmlPromises() {
		const promiseCount = this.#xmlPromises.length
		return this.#xmlPromises.map((_, index) => this.#xmlPromises[promiseCount - index - 1])
	}
	static properties = {}
	static styles = css`
		dictionary-entries:not(:empty) {
			flex-grow: 1;
			width: 100%;
		}
	`
	#trimXmlPromises() {
		const promiseCount = this.#xmlPromises.length
		for (let i = 0; i < promiseCount; i++) {
			if (this.#xmlPromises[i].abort !== undefined && this.#xmlPromises[i].abort()) {
				this.#xmlPromises.splice(i, 1)
			}
		}
	}
	#queueXmlPromise(params) {
		this.#trimXmlPromises()
		if (typeof params.selectedLanguagePair === 'string') this.#selectedLanguagePair = params.selectedLanguagePair
		if (typeof params.userInput === 'string') this.#userInput = params.userInput
		if (howManyBytesIn(this.#userInput) < this.minimumInputBytes) return console.log('User input is too small :(')
		const apiUrl = `/search/${this.#selectedLanguagePair}/${this.#userInput}`
		console.log(`Fetching api at ${apiUrl}...`)
		// This is a loophole to allow abortion of fetch requests
		// Each promise has an abort method which returns true and aborts the promise if not resolved, or returns false if resolved
		const abortController = new AbortController()
		const xmlPromise = fetch(apiUrl, {
			signal: abortController.signal
		}).then(res => res.text())
		xmlPromise.abort = () => {
			abortController.abort()
			return true
		}
		this.#xmlPromises.push(xmlPromise)
		this.requestUpdate()
		xmlPromise.then(
			() => {
				xmlPromise.abort = () => false
			}
		)
	}
	render() {
		console.log('Rendering the dictionary...')
		return html`
			<div>
				<language-picker
					.selectLanguagePair=${(selectedLanguagePair) => this.#queueXmlPromise({ selectedLanguagePair })}
				></language-picker>
				<input
					type="text"
					name="search"
					placeholder="Search a word"
					@input=${(e) => this.#queueXmlPromise({ userInput: e.target.value })}
				/>
				<dictionary-entries xmlString=${until(...this.#newestXmlPromises)}></dictionary-entries>
			</div>
		`
	}
})