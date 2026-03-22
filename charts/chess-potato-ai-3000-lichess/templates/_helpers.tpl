{{- define "chess-potato-ai-3000-lichess.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chess-potato-ai-3000-lichess.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "chess-potato-ai-3000-lichess.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chess-potato-ai-3000-lichess.labels" -}}
helm.sh/chart: {{ include "chess-potato-ai-3000-lichess.chart" . }}
app.kubernetes.io/name: {{ include "chess-potato-ai-3000-lichess.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "chess-potato-ai-3000-lichess.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chess-potato-ai-3000-lichess.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "chess-potato-ai-3000-lichess.configSecretName" -}}
{{- printf "%s-config" (include "chess-potato-ai-3000-lichess.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
