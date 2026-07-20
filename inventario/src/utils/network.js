let subscribers = []

export async function isOnline() {
    if (typeof navigator !== 'undefined') {
        if (!navigator.onLine) return false
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 2500)
            await fetch('https://api.ipify.org?format=json', { 
                method: 'GET', 
                signal: controller.signal,
                cache: 'no-store'
            })
            clearTimeout(timeout)
            return true
        } catch {
            return false
        }
    }
    return false
}

export function subscribeToOnline(cb) {
    subscribers.push(cb)
    return () => { subscribers = subscribers.filter(s => s !== cb) }
}

export function subscribeToOffline(cb) {
    subscribers.push(cb)
    return () => { subscribers = subscribers.filter(s => s !== cb) }
}

function notify(type) {
    subscribers.forEach(cb => cb(type))
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => notify('online'))
    window.addEventListener('offline', () => notify('offline'))
}
