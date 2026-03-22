{{- define "chess-potato-ai-3000-web.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chess-potato-ai-3000-web.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "chess-potato-ai-3000-web.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chess-potato-ai-3000-web.labels" -}}
helm.sh/chart: {{ include "chess-potato-ai-3000-web.chart" . }}
app.kubernetes.io/name: {{ include "chess-potato-ai-3000-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "chess-potato-ai-3000-web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chess-potato-ai-3000-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "chess-potato-ai-3000-web.serverName" -}}
{{- printf "%s-server" (include "chess-potato-ai-3000-web.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chess-potato-ai-3000-web.frontendName" -}}
{{- printf "%s-frontend" (include "chess-potato-ai-3000-web.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chess-potato-ai-3000-web.serverSecretName" -}}
{{- printf "%s-server-secret" (include "chess-potato-ai-3000-web.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chess-potato-ai-3000-web.nginxConfigName" -}}
{{- printf "%s-frontend-nginx" (include "chess-potato-ai-3000-web.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
