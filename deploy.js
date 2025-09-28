/** @type {import('ts-kubernetes-action').DeploymentConfig} */
module.exports = async (k8s, { sha }) => {
  const namespace = "dev";
  const labels = { app: "yaml-converter" };

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
              name: "converter",
              image: `registry.knatofs.se/yaml-converter:${sha.substring(
                0,
                7
              )}`,
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
  });
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
  });
  await k8s.createIngress(namespace, {
    metadata: {
      name: "yaml-converter",
      annotations: {
        "cert-manager.io/cluster-issuer": "letsencrypt-prod",
      },
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
  });
};
