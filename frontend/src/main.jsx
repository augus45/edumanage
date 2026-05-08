import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BadgeCheck,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api/v1";

const demoAuth = {
  email: "demo@edumanage.dev",
  password: "Demo12345",
  role: "agent",
};

const defaultServiceForm = {
  name: "",
  description: "",
  price: "",
  is_active: true,
};

const defaultClientForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
};

const statusLabels = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
};

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

async function request(path, options = {}) {
  const token = localStorage.getItem("edumanage.token");
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const detail = payload?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(". ")
      : detail || "No se pudo completar la accion.";
    throw new Error(message);
  }

  return payload;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("edumanage.token") || "");
  const [me, setMe] = useState(null);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [serviceForm, setServiceForm] = useState(defaultServiceForm);
  const [clientForm, setClientForm] = useState(defaultClientForm);
  const [authForm, setAuthForm] = useState(demoAuth);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    type: "info",
    message: "Listo para conectar con la API.",
  });

  const hasSession = Boolean(token);

  const metrics = useMemo(() => {
    const activeServices = services.filter((service) => service.is_active).length;
    const revenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const completed = orders.filter((order) => order.status === "completed").length;

    return [
      { label: "Servicios activos", value: activeServices, icon: BookOpenCheck },
      { label: "Clientes", value: clients.length, icon: Users },
      { label: "Pedidos", value: orders.length, icon: ClipboardList },
      { label: "Pipeline", value: formatMoney(revenue), icon: Activity },
      { label: "Finalizados", value: completed, icon: BadgeCheck },
    ];
  }, [services, clients, orders]);

  async function refreshPublicData() {
    const data = await request("/services/");
    setServices(data);
    if (!selectedServiceId && data[0]?.id) {
      setSelectedServiceId(data[0].id);
    }
  }

  async function refreshPrivateData() {
    if (!localStorage.getItem("edumanage.token")) {
      return;
    }

    const [profile, clientList, orderList] = await Promise.all([
      request("/users/me"),
      request("/clients/"),
      request("/orders/"),
    ]);

    setMe(profile);
    setClients(clientList);
    setOrders(orderList);
    if (!selectedClientId && clientList[0]?.id) {
      setSelectedClientId(clientList[0].id);
    }
  }

  async function refreshAll() {
    setLoading(true);
    try {
      await refreshPublicData();
      await refreshPrivateData();
      setStatus({ type: "success", message: "Datos sincronizados con EduManage API." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function loginWithCredentials(email, password) {
    const form = new FormData();
    form.append("username", email);
    form.append("password", password);

    const data = await request("/auth/login", {
      method: "POST",
      body: form,
    });

    localStorage.setItem("edumanage.token", data.access_token);
    setToken(data.access_token);
    await refreshPrivateData();
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setAuthForm(demoAuth);
    try {
      try {
        await request("/users/", {
          method: "POST",
          body: JSON.stringify(demoAuth),
        });
      } catch (error) {
        if (!error.message.toLowerCase().includes("registrado")) {
          throw error;
        }
      }

      await loginWithCredentials(demoAuth.email, demoAuth.password);
      setStatus({ type: "success", message: "Demo lista. Sesión iniciada con el agente demo." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await loginWithCredentials(authForm.email, authForm.password);
      setStatus({ type: "success", message: "Sesión iniciada. Panel operativo habilitado." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("edumanage.token");
    setToken("");
    setMe(null);
    setClients([]);
    setOrders([]);
    setSelectedClientId("");
    setStatus({ type: "info", message: "Sesión cerrada." });
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await request("/services/", {
        method: "POST",
        body: JSON.stringify({
          ...serviceForm,
          price: Number(serviceForm.price),
        }),
      });
      setServiceForm(defaultServiceForm);
      await refreshPublicData();
      setStatus({ type: "success", message: "Servicio creado e invalidación de cache ejecutada." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleClientSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const created = await request("/clients/", {
        method: "POST",
        body: JSON.stringify(clientForm),
      });
      setClientForm(defaultClientForm);
      await refreshPrivateData();
      setSelectedClientId(created.id);
      setStatus({ type: "success", message: "Cliente creado y sincronización CRM disparada." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await request("/orders/", {
        method: "POST",
        body: JSON.stringify({
          client_id: selectedClientId,
          service_id: selectedServiceId,
        }),
      });
      await refreshPrivateData();
      setStatus({ type: "success", message: "Pedido creado y notificación enviada al microservicio Node." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId, nextStatus) {
    setLoading(true);
    try {
      await request(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshPrivateData();
      setStatus({ type: "success", message: "Estado del pedido actualizado." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <nav className="topbar" aria-label="Navegación principal">
          <div className="brand-mark">
            <GraduationCap size={22} />
            <span>EduManage</span>
          </div>
          <div className="topbar-actions">
            <span className="api-pill">
              <ShieldCheck size={16} />
              {API_URL.replace("/api/v1", "")}
            </span>
            <button className="icon-button" type="button" onClick={refreshAll} disabled={loading} aria-label="Actualizar">
              {loading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            </button>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Plataforma académica fullstack</p>
            <h1>Gestión de servicios, clientes y pedidos desde una demo real.</h1>
            <p>
              Frontend conectado a FastAPI para mostrar autenticación JWT, catálogo cacheado con Redis,
              workflow de pedidos, sincronización CRM simulada y notificaciones asíncronas.
            </p>
            <div className="hero-actions">
              <a href="#dashboard" className="primary-link">
                Ver panel <ChevronRight size={18} />
              </a>
              <a href="#catalogo" className="secondary-link">Explorar catálogo</a>
            </div>
          </div>

          <div className="status-card">
            <div className="status-card-head">
              <Sparkles size={20} />
              <span>Estado de la demo</span>
            </div>
            <p className={status.type}>{status.message}</p>
            <dl>
              <div>
                <dt>Sesión</dt>
                <dd>{hasSession ? me?.email || "Activa" : "Sin iniciar"}</dd>
              </div>
              <div>
                <dt>Stack</dt>
                <dd>React + FastAPI + PostgreSQL</dd>
              </div>
              <div>
                <dt>Objetivo</dt>
                <dd>Demo para portfolio</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="metrics-strip" id="dashboard">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <Icon size={18} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="workspace">
        <aside className="auth-panel">
          <div className="section-title">
            <LogIn size={20} />
            <div>
              <p className="eyebrow">Acceso agente</p>
              <h2>Sesión demo</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleLogin}>
            <label>
              Email
              <input
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                type="email"
                required
              />
            </label>
            <label>
              Password
              <input
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                type="password"
                required
              />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit" disabled={loading}>
                <LogIn size={17} />
                Entrar
              </button>
              <button className="ghost-button" type="button" onClick={handleRegister} disabled={loading}>
                <UserPlus size={17} />
                Crear demo
              </button>
            </div>
          </form>
          {hasSession && (
            <button className="text-button" type="button" onClick={logout}>
              Cerrar sesión
            </button>
          )}
        </aside>

        <section className="panel" id="catalogo">
          <div className="section-title">
            <BriefcaseBusiness size={20} />
            <div>
              <p className="eyebrow">Catálogo</p>
              <h2>Servicios académicos</h2>
            </div>
          </div>
          <div className="service-grid">
            {services.length === 0 ? (
              <EmptyState title="Todavía no hay servicios" text="Crea un servicio para cargar el catálogo cacheado." />
            ) : (
              services.map((service) => (
                <article
                  className={`service-card ${selectedServiceId === service.id ? "selected" : ""}`}
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                >
                  <div>
                    <h3>{service.name}</h3>
                    <p>{service.description || "Servicio académico personalizado."}</p>
                  </div>
                  <strong>{formatMoney(service.price)}</strong>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="management-grid">
        <Panel title="Nuevo servicio" eyebrow="Admin" icon={Plus}>
          <form className="form-grid" onSubmit={handleServiceSubmit}>
            <label>
              Nombre
              <input
                value={serviceForm.name}
                onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })}
                placeholder="Tutoría matemática"
                required
              />
            </label>
            <label>
              Descripcion
              <textarea
                value={serviceForm.description}
                onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })}
                placeholder="Acompañamiento personalizado para estudiantes."
                rows="3"
              />
            </label>
            <label>
              Precio
              <input
                value={serviceForm.price}
                onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })}
                type="number"
                min="1"
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={!hasSession || loading}>
              <Plus size={17} />
              Crear servicio
            </button>
          </form>
        </Panel>

        <Panel title="Nuevo cliente" eyebrow="CRM" icon={Users}>
          <form className="form-grid" onSubmit={handleClientSubmit}>
            <div className="two-cols">
              <label>
                Nombre
                <input
                  value={clientForm.first_name}
                  onChange={(event) => setClientForm({ ...clientForm, first_name: event.target.value })}
                  required
                />
              </label>
              <label>
                Apellido
                <input
                  value={clientForm.last_name}
                  onChange={(event) => setClientForm({ ...clientForm, last_name: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Email
              <input
                value={clientForm.email}
                onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })}
                type="email"
                required
              />
            </label>
            <label>
              Telefono
              <input
                value={clientForm.phone}
                onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })}
              />
            </label>
            <button className="primary-button" type="submit" disabled={!hasSession || loading}>
              <UserPlus size={17} />
              Guardar cliente
            </button>
          </form>
        </Panel>

        <Panel title="Crear pedido" eyebrow="Workflow" icon={ClipboardList}>
          <form className="form-grid" onSubmit={handleOrderSubmit}>
            <label>
              Cliente
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                required
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Servicio
              <select
                value={selectedServiceId}
                onChange={(event) => setSelectedServiceId(event.target.value)}
                required
              >
                <option value="">Seleccionar servicio</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {formatMoney(service.price)}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={!hasSession || loading}>
              <CheckCircle2 size={17} />
              Confirmar pedido
            </button>
          </form>
        </Panel>
      </section>

      <section className="panel orders-panel">
        <div className="section-title">
          <LayoutDashboard size={20} />
          <div>
            <p className="eyebrow">Operaciones</p>
            <h2>Pedidos recientes</h2>
          </div>
        </div>
        <div className="orders-list">
          {orders.length === 0 ? (
            <EmptyState title="No hay pedidos todavía" text="Crea clientes y pedidos para probar el flujo completo." />
          ) : (
            orders.map((order) => (
              <article className="order-row" key={order.id}>
                <div>
                  <span className={`status-badge ${order.status}`}>{statusLabels[order.status]}</span>
                  <h3>Pedido #{order.id.slice(0, 8)}</h3>
                  <p>Cliente {order.client_id.slice(0, 8)} · Servicio {order.service_id.slice(0, 8)}</p>
                </div>
                <strong>{formatMoney(order.total_amount)}</strong>
                <select
                  value={order.status}
                  onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                  aria-label="Actualizar estado"
                >
                  {Object.keys(statusLabels).map((statusKey) => (
                    <option key={statusKey} value={statusKey}>
                      {statusLabels[statusKey]}
                    </option>
                  ))}
                </select>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, eyebrow, icon: Icon, children }) {
  return (
    <section className="panel">
      <div className="section-title">
        <Icon size={20} />
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <ClipboardList size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
