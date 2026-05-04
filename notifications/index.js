const express = require('express');
const morgan = require('morgan');
// const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 3000;

// Configuración simulada de Nodemailer
// const transporter = nodemailer.createTransport({ ... });

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'notifications' });
});

app.post('/api/notify', async (req, res) => {
    const { to, template, data } = req.body;

    if (!to || !template) {
        return res.status(400).json({ error: 'Faltan parámetros (to, template)' });
    }

    console.log(`\n[NOTIFICACIÓN] Preparando envío de email...`);
    console.log(`Destinatario: ${to}`);
    console.log(`Template: ${template}`);
    console.log(`Datos:`, JSON.stringify(data, null, 2));

    try {
        // En entorno real: await transporter.sendMail(...)
        // Simulamos delay de red:
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`[NOTIFICACIÓN] Email '${template}' enviado exitosamente a ${to}.\n`);
        res.json({ success: true, message: 'Notificación enviada' });
    } catch (error) {
        console.error(`[NOTIFICACIÓN] Error al enviar email:`, error);
        res.status(500).json({ success: false, error: 'Error al enviar la notificación' });
    }
});

app.listen(PORT, () => {
    console.log(`Microservicio de Notificaciones corriendo en el puerto ${PORT}`);
});
