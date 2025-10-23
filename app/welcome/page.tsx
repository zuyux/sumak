'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Eye, EyeOff, CheckCircle, ArrowRight, Shield, Wallet, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';

export default function WelcomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams?.get('email');
  const { currentWallet, isAuthenticated } = useEncryptedWallet();

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [acknowledgedBackup, setAcknowledgedBackup] = useState(false);
  const [step, setStep] = useState<'welcome' | 'backup' | 'security'>('welcome');

  // Redirect if not authenticated or no wallet
  useEffect(() => {
    if (!isAuthenticated || !currentWallet) {
      router.push('/');
    }
  }, [isAuthenticated, currentWallet, router]);

  const copyMnemonic = async () => {
    if (currentWallet?.mnemonic) {
      try {
        await navigator.clipboard.writeText(currentWallet.mnemonic);
        setCopiedMnemonic(true);
        toast.success('Frase mnemónica copiada al portapapeles');
        setTimeout(() => setCopiedMnemonic(false), 3000);
      } catch {
        toast.error('Error al copiar al portapapeles');
      }
    }
  };

  const handleContinue = () => {
    if (step === 'welcome') {
      setStep('backup');
    } else if (step === 'backup') {
      setStep('security');
    } else {
      // Route to address-based page when setup is complete
      if (currentWallet?.address) {
        router.push(`/${currentWallet.address}`);
      } else {
        router.push('/profile');
      }
    }
  };

  if (!currentWallet) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card border-border shadow-2xl my-24">
        {step === 'welcome' && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <CardTitle className="text-3xl text-foreground mb-2">Bien ahí SBTC!</CardTitle>
              <p className="text-muted-foreground">
                Tu billetera ha sido creada y asegurada exitosamente
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Account Info */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  Detalles de tu Cuenta
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="text-foreground font-medium">{email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Dirección de Billetera</label>
                    <p className="text-foreground font-mono text-sm break-all">{currentWallet.address}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Etiqueta de Billetera</label>
                    <p className="text-foreground">{currentWallet.label}</p>
                  </div>
                </div>
              </div>

              {/* What's Next */}
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">¿Qué sigue?</h3>
                <div className="space-y-3 text-muted-foreground">
                  <div className="flex items-start">
                    <span className="mr-3 text-primary">1.</span>
                    <span>Respalda tu frase de recuperación (siguiente paso)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-3 text-primary">2.</span>
                    <span>Aprende sobre la seguridad de billeteras</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-3 text-primary">3.</span>
                    <span>Comienza a usar tu billetera para transacciones</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-3 cursor-pointer"
              >
                Continuar al Respaldo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {step === 'backup' && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto my-16">
                <Key className="w-10 h-10 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-foreground mb-2">Respalda tu Frase de Recuperación</CardTitle>
              <p className="text-muted-foreground">
                Esta frase de 24 palabras es la única forma de recuperar tu billetera. ¡Guárdala de forma segura!
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Mnemonic Display */}
              <div className="bg-surface-secondary border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Frase de Recuperación</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="text-muted-foreground border-border hover:bg-muted cursor-pointer"
                    >
                      {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyMnemonic}
                      className="text-muted-foreground border-border hover:bg-muted cursor-pointer"
                      disabled={!showMnemonic}
                    >
                      {copiedMnemonic ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {currentWallet.mnemonic.split(' ').map((word, index) => (
                    <div
                      key={index}
                      className="bg-surface-secondary border border-border rounded p-3 text-center"
                    >
                      <span className="text-xs text-muted-foreground block mb-1">{index + 1}</span>
                      <span className="text-foreground font-mono">
                        {showMnemonic ? word : '••••••'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Warning */}
              <div className="border border-red-700/50 rounded-lg p-4">
                <h4 className="text-red-500 font-medium text-sm mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Información Crítica de Seguridad
                </h4>
                <ul className="text-red-500/80 text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    Nunca compartas tu frase de recuperación con nadie
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    Guárdala en un lugar seguro y sin conexión
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    Cualquiera con esta frase puede acceder a tu billetera
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    No podemos recuperar tu billetera si pierdes esta frase
                  </li>
                </ul>
              </div>

              {/* Acknowledgment */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="backup-acknowledge"
                  checked={acknowledgedBackup}
                  onChange={(e) => setAcknowledgedBackup(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="backup-acknowledge" className="text-sm text-muted-foreground cursor-pointer">
                  Entiendo que soy responsable de respaldar mi frase de recuperación y que 
                  perderla significa perder el acceso a mi billetera permanentemente.
                </label>
              </div>

              <Button
                onClick={handleContinue}
                disabled={!acknowledgedBackup}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-3 disabled:opacity-50 cursor-pointer"
              >
                He Respaldado Mi Frase
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {step === 'security' && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-foreground mb-2">Mejores Prácticas de Seguridad</CardTitle>
              <p className="text-muted-foreground">
                Sigue estas pautas para mantener tu billetera segura
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Security Tips */}
              <div className="space-y-4">
                <div className=" border border-green-700/30 rounded-lg p-4">
                  <h4 className="text-green-500  font-medium mb-3">✅ Haz Esto</h4>
                  <ul className="text-green-500/80 text-sm space-y-2">
                    <li>• Usa una contraseña fuerte y única para tu billetera</li>
                    <li>• Habilita la autenticación de dos factores cuando sea posible</li>
                    <li>• Mantén tu software actualizado</li>
                    <li>• Usa billeteras de hardware para grandes cantidades</li>
                    <li>• Verifica todos los detalles de la transacción antes de confirmar</li>
                  </ul>
                </div>

                <div className=" border border-red-700/30 rounded-lg p-4">
                  <h4 className="text-red-500 font-medium mb-3">❌ Evita Esto</h4>
                  <ul className="text-red-500/80 text-sm space-y-2">
                    <li>• Nunca ingreses tu frase semilla en sitios web sospechosos</li>
                    <li>• No guardes tus claves en capturas de pantalla o almacenamiento en la nube</li>
                    <li>• Evita usar WiFi público para transacciones de billetera</li>
                    <li>• Nunca compartas tus claves privadas o frase semilla</li>
                    <li>• No hagas clic en enlaces sospechosos en emails o mensajes</li>
                  </ul>
                </div>
              </div>

              {/* Getting Started */}
              <div className="border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-blue-500 font-medium mb-3">¿Listo para Comenzar?</h4>
                <p className="text-blue-500/80 text-sm mb-3">
                  Tu billetera ya está configurada y lista para usar. Puedes comenzar a recibir tokens STX, 
                  desplegar contratos inteligentes e interactuar con el ecosistema Stacks.
                </p>
                <p className="text-blue-500/80 text-sm">
                  Visita tu perfil para ver los detalles de tu billetera y el historial de transacciones.
                </p>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-500 text-primary-foreground font-semibold py-6 cursor-pointer"
              >
                Completar Configuración
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
