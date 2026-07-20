import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { isOnline, subscribeToOnline, subscribeToOffline } from './utils/network'
import { sincronizarConSupabase } from './services/sync'
import { sincronizarSupabaseALocal, haySupabaseConDatos, localTieneDatos } from './services/dataService'
import Layout from './components/Layout'
import OnboardingWizard from './components/OnboardingWizard'
import RestorePrompt from './components/RestorePrompt'
import TourTooltips from './components/TourTooltips'
import { isOnboarded } from './services/onboarding'
import { getMiEmpresaCompleta } from './services/onboarding'
import { getTema } from './services/themeService'
import { TemaProvider } from './context/TemaContext'
import Dashboard from './pages/Dashboard'
import GastosIngresos from './pages/GastosIngresos'
import Contactos from './pages/Contactos'
import Reportes from './pages/Reportes'
import CierreCaja from './pages/CierreCaja'
import Inventario from './pages/Inventario'
import AjusteStock from './pages/AjusteStock'
import Caja from './pages/Caja'
import Kardex from './pages/Kardex'
import Productos from './pages/Productos'
import Categorias from './pages/Categorias'
import Proveedores from './pages/Proveedores'
import FacturasProveedores from './pages/FacturasProveedores'
import Configuracion from './pages/Configuracion'
import POS from './pages/POS'
import Tickets from './pages/Tickets'
// Estado de sincronización COMPARTIDO entre montajes (Strict Mode, doble useEffect)
let syncEnProgreso = false;
let dfCancelarSubscripcion = null;

export default function App() {
    const dfUltimoOnline = useRef(0);
    const [onboarded, setOnboarded] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [mostrarTour, setMostrarTour] = useState(false);
    const [tema, setTema] = useState(null);
    const [rubroId, setRubroId] = useState('retail');
    const [necesitaRestaurar, setNecesitaRestaurar] = useState(false);

    // Hook 1: estado de onboarding
    useEffect(() => {
        isOnboarded().then(ok => {
            setOnboarded(ok);
            setCargando(false);
            if (ok) {
                const yaTour = localStorage.getItem('tour_visto');
                if (!yaTour) setMostrarTour(true);
            }
        });
    }, []);

    // Hook 1.1: detectar si hay que restaurar desde Supabase
    // (local vacía pero la nube ya tiene datos)
    useEffect(() => {
        if (!onboarded) return;
        (async () => {
            try {
                const tieneLocal = await localTieneDatos();
                if (tieneLocal) return;
                const hayNube = await haySupabaseConDatos();
                if (hayNube) setNecesitaRestaurar(true);
            } catch (_) { /* ignorar */ }
        })();
    }, [onboarded]);

    // Hook 1.5: cargar tema según rubro
    useEffect(() => {
        getMiEmpresaCompleta().then(miEmpresa => {
            if (miEmpresa && miEmpresa.rubro) {
                setTema(getTema(miEmpresa.rubro));
                setRubroId(miEmpresa.rubro);
            } else {
                const temaRetail = getTema('retail');
                setTema(temaRetail);
                setRubroId('retail');
            }
        }).catch(() => {
            const temaRetail = getTema('retail');
            setTema(temaRetail);
            setRubroId('retail');
        })
    }, [onboarded])

    // Hook 1.6: aplicar tema dinámico por rubro
    useEffect(() => {
        if (!tema) return
        const root = document.documentElement
        root.style.setProperty('--color-primary', tema.primary)
        root.style.setProperty('--color-primary-dark', tema.primaryDark)
        root.style.setProperty('--color-primary-light', tema.primaryLight || tema.primary)
        root.style.setProperty('--color-primary-tint', tema.primaryTint || tema.background)
        root.style.setProperty('--color-primary-border', tema.primaryBorder || tema.border)
        root.style.setProperty('--color-accent', tema.accent)
        root.style.setProperty('--color-background', tema.background)
        root.style.setProperty('--color-card', tema.card)
        root.style.setProperty('--color-text', tema.text)
        root.style.setProperty('--color-text-secondary', tema.textSecondary)
        root.style.setProperty('--color-border', tema.border)
        root.style.setProperty('--color-success', tema.success)
        root.style.setProperty('--color-warning', tema.warning)
        root.style.setProperty('--color-danger', tema.danger)
        root.style.setProperty('--color-info', tema.info)
    }, [tema])

    // Hook 2: sincronización online/offline (SIEMPRE se llama, antes de cualquier return)
    useEffect(() => {
        const handleOnline = async () => {
            if (syncEnProgreso) return;
            syncEnProgreso = true;
            console.log('🔄 Conexión recuperada - sincronizando...');
            try {
                await sincronizarSupabaseALocal();
                await sincronizarConSupabase();
            } catch (e) {
                console.warn('Sync error:', e?.message || e);
            }
            syncEnProgreso = false;
        };

        const handleOffline = () => {
            console.log('📴 Sin conexión - trabajando offline')
        };

        if (dfCancelarSubscripcion) dfCancelarSubscripcion();
        dfCancelarSubscripcion = subscribeToOnline(handleOnline);
        const dfOff = subscribeToOffline(handleOffline);

        isOnline().then(async online => {
            if (online) {
                await handleOnline();
            }
        });

        const intervalo = setInterval(async () => {
            const online = await isOnline();
            if (online && !syncEnProgreso) {
                console.log('⏰ Sincronización periódica...');
                try {
                    await sincronizarSupabaseALocal();
                    await sincronizarConSupabase();
                } catch (e) {
                    console.warn('Sync periódica error:', e?.message || e);
                }
            }
        }, 30000);

        return () => {
            dfOff();
            if (dfCancelarSubscripcion) dfCancelarSubscripcion();
            clearInterval(intervalo);
        };
    }, []);

    // Returns condicionales DESPUÉS de todos los hooks (regla de hooks).
    if (cargando) {
        return <div className="min-h-screen flex items-center justify-center text-menta-dark font-bold">Cargando…</div>;
    }

    if (!onboarded) {
        return <OnboardingWizard onComplete={() => { setOnboarded(true); setMostrarTour(true); }} />;
    }

    if (necesitaRestaurar) {
        return <RestorePrompt onDone={() => setNecesitaRestaurar(false)} />;
    }

    return (
        <BrowserRouter>
            <TemaProvider rubroId={rubroId}>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="gastos-ingresos" element={<GastosIngresos />} />
                        <Route path="contactos" element={<Contactos />} />
                        <Route path="reportes" element={<Reportes />} />
                        <Route path="inventario" element={<Inventario />} />
                        <Route path="ajuste" element={<AjusteStock />} />
                        <Route path="caja" element={<Caja />} />
                        <Route path="kardex" element={<Kardex />} />
                        <Route path="productos" element={<Productos />} />
                        <Route path="categorias" element={<Categorias />} />
                        <Route path="proveedores" element={<Proveedores />} />
                        <Route path="FacturasProveedores" element={<FacturasProveedores />} />
                        <Route path="configuracion" element={<Configuracion />} />
                        <Route path="POS" element={<POS />} />
                        <Route path="tickets" element={<Tickets />} />
                        <Route path="cierre-caja" element={<CierreCaja />} />
                    </Route>
                </Routes>
            </TemaProvider>
            {mostrarTour && (
                <TourTooltips onFinish={() => { setMostrarTour(false); localStorage.setItem('tour_visto', '1') }} />
            )}
        </BrowserRouter>
    )
}
