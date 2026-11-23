import { supabase } from "../lib/supabaseClient.js";

// Há 2FA ativa quando existe um fator TOTP verificado
export async function statusDuasEtapas() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const fator = data.totp[0] ?? null; // "totp" só traz fatores verificados
  return { ativo: !!fator, fatorId: fator?.id ?? null };
}

// Cria o fator e devolve QR (imagem SVG) e chave de texto
export async function iniciarTotp() {
  // limpa tentativas anteriores que ficaram sem verificar
  const { data: lista } = await supabase.auth.mfa.listFactors();
  for (const f of lista?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Income Of Houses"
  });
  if (error) throw error;
  return { fatorId: data.id, qr: data.totp.qr_code, segredo: data.totp.secret };
}

// Valida o código de 6 dígitos; se estiver certo, o fator passa a "verificado"
export async function confirmarTotp(fatorId, codigo) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo });
  if (error) throw error;
}

// Cancela o cadastro no meio do caminho
export async function cancelarTotp(fatorId) {
  await supabase.auth.mfa.unenroll({ factorId: fatorId });
}

// Desativa (o Supabase exige sessão AAL2, ou seja, que o código já tenha sido validado nesta sessão)
export async function desativarDuasEtapas(fatorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId: fatorId });
  if (error) throw error;
}