/** @type {import('ts-kubernetes-action').DeploymentConfig} */
module.exports = async (k8s, { sha }) => {
  const namespace = "default"
  const labels = { app: "yaml-converter" }

  await k8s.createConfigMap(namespace, {
    metadata: {
      name: "promtail-config",
    },
    data: {
      "promtail.yaml": `
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki.loki-stack.svc:3100/loki/api/v1/push

scrape_configs:
- job_name: push1
  loki_push_api:
    server:
      http_listen_port: 3500
      grpc_listen_port: 3600
    labels:
      pushserver: push1
`
    }
  })

  await k8s.createDeployment(namespace, {
    metadata: {
      name: "yaml-converter",
      labels,
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: labels,
      },
      template: {
        metadata: {
          labels,
        },
        spec: {
          imagePullSecrets: [
            {
              name: "regcred",
            },
          ],
          volumes: [
            {
              name: "config",
              configMap: {
                name: "promtail-config",
              },
            },
          ],
          containers: [
            {
              name: "promtail",
              image: "grafana/promtail:2.2.1",
              imagePullPolicy: "Always",
              args: [
                "-config.file=/etc/promtail/promtail.yaml",
                "-client.external-labels=app=yaml-converter",
              ],
              ports: [
                {
                  containerPort: 9080,
                },
              ],
              volumeMounts: [
                {
                  name: "config",
                  mountPath: "/etc/promtail",
                  subPath: "promtail.yaml",
                },
              ],
            },
            {
              name: "converter",
              image: `registry.knatofs.se/yaml-converter:${sha}`,
              imagePullPolicy: "Always",
              ports: [
                {
                  containerPort: 8080,
                },
              ],
              resources: {
                requests: {
                  memory: "40Mi",
                },
              },
            },
          ],
        },
      },
    },
  })
  await k8s.createService(namespace, {
    metadata: {
      name: "yaml-converter",
    },
    spec: {
      selector: labels,
      ports: [
        {
          port: 8080,
        },
      ],
    },
  })
  await k8s.createIngress(namespace, {
    metadata: {
      name: "yaml-converter",
    },
    spec: {
      ingressClassName: "nginx",
      rules: [
        {
          host: "yaml-converter.knatofs.se",
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: "yaml-converter",
                    port: {
                      number: 8080,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  })
}
