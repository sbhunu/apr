/**
 * Metrics API Route
 * Returns system performance and health metrics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
	try {
		const supabase = await createClient();

		// Collect basic metrics
		const metrics = {
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: {
				used: process.memoryUsage().heapUsed,
				total: process.memoryUsage().heapTotal,
			},
			database: {
				connected: false,
				responseTime: null as number | null,
			},
		};

		// Test database connection
		try {
			const startTime = Date.now();
			const { error } = await supabase.from('apr.schemes').select('id').limit(1);
			const responseTime = Date.now() - startTime;

			metrics.database.connected = !error;
			metrics.database.responseTime = responseTime;
		} catch (err) {
			metrics.database.connected = false;
		}

		return NextResponse.json({
			success: true,
			metrics,
		});
	} catch (error) {
		console.error('Error collecting metrics:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to collect metrics',
				metrics: {
					timestamp: new Date().toISOString(),
					uptime: process.uptime(),
					memory: {
						used: process.memoryUsage().heapUsed,
						total: process.memoryUsage().heapTotal,
					},
					database: {
						connected: false,
						responseTime: null,
					},
				},
			},
			{ status: 500 }
		);
	}
}

