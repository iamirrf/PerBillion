import { useEffect, useRef, useState } from 'react'

export default function HeroSculpture() {
  const mount = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const host = mount.current
    let savedMotion = false
    try { savedMotion = localStorage.getItem('perbillion-reduced-motion') === 'true' } catch { /* Use system preference. */ }
    if (!host || savedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 720) { setFallback(true); return }
    let disposed = false
    let active = true
    let frame = 0
    let cleanup = () => undefined
    import('three').then(THREE => {
      if (disposed || !host) return
      try {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.15
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(34, 1, .1, 100)
        camera.position.set(0, 0, 7.3)
        const group = new THREE.Group()
        scene.add(group)
        const geometry = new THREE.TorusKnotGeometry(1.55, .42, 220, 32, 2, 3)
        const material = new THREE.MeshPhysicalMaterial({ color: 0xd7bc7f, metalness: .82, roughness: .24, clearcoat: .7, clearcoatRoughness: .16 })
        const sculpture = new THREE.Mesh(geometry, material)
        sculpture.rotation.set(.55, -.35, .18)
        group.add(sculpture)
        const wire = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xf4e7c3, wireframe: true, transparent: true, opacity: .045 }))
        wire.scale.setScalar(1.035)
        sculpture.add(wire)
        scene.add(new THREE.HemisphereLight(0xfff2cf, 0x0a0b0c, 2.3))
        const key = new THREE.PointLight(0xffd77a, 85, 20); key.position.set(3.5, 2.5, 5); scene.add(key)
        const edge = new THREE.PointLight(0x9d7b38, 55, 18); edge.position.set(-4, -2, 2); scene.add(edge)
        host.appendChild(renderer.domElement)
        const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix() }
        const observer = new IntersectionObserver(entries => { active = entries[0]?.isIntersecting ?? true }, { rootMargin: '100px' })
        observer.observe(host)
        const onPointer = (event: PointerEvent) => { const box = host.getBoundingClientRect(); group.rotation.y = ((event.clientX - box.left) / box.width - .5) * .25; group.rotation.x = ((event.clientY - box.top) / box.height - .5) * .12 }
        host.addEventListener('pointermove', onPointer, { passive: true })
        window.addEventListener('resize', resize)
        resize()
        const render = (time: number) => { if (disposed) return; if (active) { sculpture.rotation.y = time * .00012; sculpture.rotation.x = .52 + Math.sin(time * .00035) * .08; renderer.render(scene, camera) } frame = requestAnimationFrame(render) }
        frame = requestAnimationFrame(render)
        cleanup = () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', resize); host.removeEventListener('pointermove', onPointer); geometry.dispose(); material.dispose(); (wire.material as { dispose: () => void }).dispose(); renderer.dispose(); renderer.domElement.remove() }
      } catch { setFallback(true) }
    }).catch(() => setFallback(true))
    return () => { disposed = true; cleanup() }
  }, [])

  return <div ref={mount} className={`hero-sculpture-3d ${fallback ? 'is-fallback' : ''}`} aria-hidden="true" />
}
