document.addEventListener("DOMContentLoaded", function() {
    const apiBase = edumanage_settings.api_url;
    const form = document.getElementById("edumanage-form");
    const serviceSelect = document.getElementById("em-service");
    const messageDiv = document.getElementById("em-message");
    const submitBtn = document.getElementById("em-submit-btn");

    // 1. Cargar catálogo de servicios desde FastAPI (cacheado en Redis)
    async function loadServices() {
        try {
            const res = await fetch(`${apiBase}/services/`);
            if (!res.ok) throw new Error("Error obteniendo servicios");
            const services = await res.json();
            
            serviceSelect.innerHTML = '<option value="">Selecciona un servicio</option>';
            services.forEach(s => {
                const option = document.createElement("option");
                option.value = s.id;
                option.textContent = `${s.name} - $${s.price}`;
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            serviceSelect.innerHTML = '<option value="">Error al cargar servicios</option>';
        }
    }

    loadServices();

    // 2. Procesar el formulario
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = "Procesando...";
        messageDiv.textContent = "";

        const firstName = document.getElementById("em-first-name").value;
        const lastName = document.getElementById("em-last-name").value;
        const email = document.getElementById("em-email").value;
        const serviceId = document.getElementById("em-service").value;

        try {
            // A. Crear o asegurar la existencia del cliente
            // NOTA: Para este prototipo simulamos que un endpoint guest de órdenes 
            // se encarga de crear el cliente y la orden en un solo paso (o lo hacemos en dos pasos).
            // Por simplicidad en la demo, asumimos que primero registramos el cliente:
            
            const clientRes = await fetch(`${apiBase}/clients/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: email
                })
            });

            // Si el cliente ya existe (400), podríamos buscarlo o tener un endpoint especifico para guest.
            // Para la demo del portfolio esto muestra la integración JS->FastAPI.
            let clientId;
            if (clientRes.status === 400) {
                // Cliente existente, habría que buscarlo. Por ahora, forzamos un error descriptivo.
                throw new Error("El email ya existe. Inicia sesión o usa otro correo.");
            }
            
            const clientData = await clientRes.json();
            clientId = clientData.id;

            // B. Crear Orden
            const orderRes = await fetch(`${apiBase}/orders/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: clientId,
                    service_id: serviceId
                })
            });
            const orderData = await orderRes.json();

            // C. Generar Link de Pago en MercadoPago
            const payRes = await fetch(`${apiBase}/payments/create-preference/${orderData.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const payData = await payRes.json();

            // Redirigir al usuario al Checkout de MP
            window.location.href = payData.init_point;

        } catch (error) {
            console.error(error);
            messageDiv.style.color = "red";
            messageDiv.textContent = error.message || "Error procesando la solicitud.";
            submitBtn.disabled = false;
            submitBtn.textContent = "Generar Pedido y Pagar";
        }
    });
});
