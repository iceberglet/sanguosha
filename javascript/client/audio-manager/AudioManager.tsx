
class AudioManager {

    cache = new Map<string, any>()

    stop(name: string) {
        let audio = this.cache.get(name)
        audio.pause()
        audio.currentTime = 0
    }

    pause(name: string) {
        let audio = this.cache.get(name)
        audio.pause()
    }

    play(name: string, loop = false, onEnd: ()=>void = null) {
        try {
            let audio: any
            if(this.cache.has(name)) {
                audio = this.cache.get(name)
            } else {
                audio = new Audio(name)
                this.cache.set(name, audio)
            }

            if(onEnd) {
                audio.onended = onEnd
            }
            audio.loop = loop
            audio.play()
            return
        } catch (err) {
            console.error('No Such Sound ', name)
        }
    }
}

export const audioManager = new AudioManager()