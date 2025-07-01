export const ciConfig = {
    "globalSettings": {
      "theme": "light",
      "widgetStoreUrl": ["*/services.json"],
      "database": "localStorage",
      "localStorage": {
          "enabled": "true",
          "loadDashboardFromConfig": "true",
          "defaultBoard": "board-1728763634657",
          "defaultView": "view-1728763634657"
      },
      "widget_cache_count": 10
    },
    "boards": [],
    "styling": {
        "widget": {
            "minColumns": 1,
            "maxColumns": 4,
            "minRows": 1,
            "maxRows": 4
        }
    }
}

export const ciBoards = [
    {
      "id": "board-1234567",
      "name": "Modified Board 1",
      "order": 0,
      "views": [
        {
          "id": "view-1234567",
          "name": "Modified View 1",
          "widgetState": [
            {
              "order": "0",
              "url": "http://localhost:8000/asd/toolbox",
              "minColumns": "4",
              "maxColumns": "4",
              "minRows": "4",
              "maxRows": "4",
              "type": "web",
              "settings": {
                "autoRefresh": false,
                "refreshInterval": 0
              },
              "metadata": {
                  "title": "toolbox"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "board-12345678",
      "name": "Modified Board 2",
      "order": 0,
      "views": [
        {
          "id": "view-12345678",
          "name": "Modified View 2",
          "widgetState": [
            {
              "order": "0",
              "url": "http://localhost:8000/asd/toolbox",
              "type": "web",
              "settings": {
                "autoRefresh": false,
                "refreshInterval": 0
              },
              "metadata": {
                  "title": "toolbox"
              }
            }
          ]
        }
      ]
    }
  ]